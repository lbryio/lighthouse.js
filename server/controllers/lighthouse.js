import 'babel-polyfill';
import winston from 'winston';
import winstonStream from 'winston-stream';
import elasticsearch from 'elasticsearch';
import rp from 'request-promise';
import pretty from 'prettysize';
import {claimSync} from '../utils/chainquery';
import {getStats} from '../utils/importer';
import crypto from 'crypto';
import got from 'got';
import {logToSlack} from '../index';

const loggerStream = winstonStream(winston, 'info');

const eclient = new elasticsearch.Client({
  host: process.env.ELASTIC_URL || 'http://localhost:9200',

  log: {
    level : 'info',
    type  : 'stream',
    stream: loggerStream,
  },
});

function getResults (input) {
  if (input.size === undefined) input.size = 10;
  if (input.from === undefined) input.from = 0;
  // Beamer - temp fix for https://github.com/lbryio/lighthouse/issues/67
  if (input.size > 10000) {
    input.size = 10000;
    input.from = 0;
  }
  if (input.from > 10000) {
    input.from = 9999;
    input.size = 1;
  }
  if (input.from + input.size > 10000) {
    input.from = 10000 - input.size;
  }
  let trimmedQuery = input.s.trim();
  let escapedQuery = getEscapedQuery(trimmedQuery);
  let washedQuery = getEscapedQuery(getWashedQuery(trimmedQuery));
  let effectiveFactor = '0.00000000001';
  // Search is split up into different parts, all search parts goes under this line.
  let channelSearch;
  if (input.channel !== undefined) { // If we got a channel argument, lets filter out only that channel
    channelSearch = {
      'bool': {
        'must': {
          'query_string': {
            'fields': ['channel'],
            'query' : getEscapedQuery(input.channel.trim()),
          },
        },
      },
    };
  }
  const conBoost = { // Controlling claims should get higher placement in search results.
    'match': {
      'bid_state': {
        'query': 'Controlling',
        'boost': 20,
      },
    },
  };
  const funcScoreClaimWeight = { // 100 LBC adds 1 point to the score
    'function_score': {
      'field_value_factor': {
        'field'  : 'effective_amount',
        'factor' : effectiveFactor,
        'missing': 1,
      },
    },
  };
  const funcScoreChannelWeight = { // 100 LBC adds 1 point to the score
    'function_score': {
      'field_value_factor': {
        'field'  : 'certificate_amount',
        'factor' : effectiveFactor,
        'missing': 1,
      },
    },
  };

  const splitName = () => {
    let queries = [];
    escapedQuery.split(' ').forEach((term) => {
      queries.push({ // Contains search term
        'query_string': {
          'query' : `*${term}*`,
          'fields': [
            'name',
          ],
          'boost': 3,
        },
      });
    });
    return queries;
  };
  const splitATD = () => {
    let queries = [];
    escapedQuery.split(' ').forEach((term) => {
      queries.push({ // Contains search term in Author, Title, Description
        'query_string': {
          'query' : `*${term}*`,
          'fields': [
            'value.stream.metadata.author',
            'value.stream.metadata.title',
            'value.stream.metadata.description',
          ],
          'boost': 1,
        },
      });
    });
    return queries;
  };

  const matPhraseName = { // Match search text as phrase - Name
    'match_phrase': {
      'name': {
        'query': escapedQuery,
        'boost': 10,
      },
    },
  };
  const matTextName = { // Match search text - Name
    'match': {
      'name': {
        'query': washedQuery,
        'boost': 5,
      },
    },
  };
  const conTermName = { // Contains search term - Name
    'query_string': {
      'query' : `*${escapedQuery}*`,
      'fields': [
        'name',
      ],
      'boost': 3,
    },
  };
  const atdSearch = { // ATD search(author, title, desc)
    'nested': {
      'path' : 'value',
      'query': {
        'bool': {
          'should': [
            ...splitATD(),
            { // Contains search term in Author, Title, Description
              'query_string': {
                'query' : `*${escapedQuery}*`,
                'fields': [
                  'value.stream.metadata.author',
                  'value.stream.metadata.title',
                  'value.stream.metadata.description',
                ],
                'boost': 1,
              },
            },
            { // Match search term - Author
              'match': {
                'value.stream.metadata.author': {
                  'query': washedQuery,
                  'boost': 2,
                },
              },
            },
            { // Match search text as phrase - Author
              'match_phrase': {
                'value.stream.metadata.author': {
                  'query': escapedQuery,
                  'boost': 3,
                },
              },
            },
            { // Match search term - Title
              'match': {
                'value.stream.metadata.title': {
                  'query': washedQuery,
                  'boost': 2,
                },
              },
            },
            { // Match search text as phrase - Title
              'match_phrase': {
                'value.stream.metadata.title': {
                  'query': escapedQuery,
                  'boost': 3,
                },
              },
            },
            { // Match search term - Description
              'match': {
                'value.stream.metadata.description': {
                  'query': washedQuery,
                  'boost': 2,
                },
              },
            },
            { // Match search text as phrase - Description
              'match_phrase': {
                'value.stream.metadata.description': {
                  'query': escapedQuery,
                  'boost': 3,
                },
              },
            },
          ],
        },
      },
    },
  };
  // End of search parts
  let esQuery = {
    index  : 'claims',
    _source: ['name', 'claimId'],
    body   : {
      'query': {
        'bool': {
          'should': [
            conBoost,
            funcScoreClaimWeight,
            funcScoreChannelWeight,
          ],
          'must': [
            channelSearch,
            {
              'bool': {
                'should': [
                  ...splitName(),
                  matPhraseName,
                  matTextName,
                  conTermName,
                  atdSearch,
                ],
              },
            },
          ],
          'filter': getFilters(input),
        },
      },
      size: input.size,
      from: input.from,
      sort: {
        _score: 'desc',
      },
    },
  };
  // console.log('QUERY: ', esQuery);
  return eclient.search(esQuery);
}

function getIndex () {
  // ideally, data is inserted into elastic search with an index that helps us query it faster/better results
  // A simple start is to default queries to be within the n months, and to make a new index each month.

}

function getRoutingKey () {
  // This is the most important field for performance. Being able to route the queries ahead of time can make typedowns insanely good.

}

function getAutoCompleteQuery (query) {
  return {
    bool: {
      should: [
        { // Author, Title, Description
          nested: {
            path : 'value',
            query: {
              multi_match: {
                query         : query.s.trim(),
                type          : 'phrase_prefix',
                slop          : 5,
                max_expansions: 50,
                fields        : [
                  'value.stream.metadata.author^3',
                  'value.stream.metadata.title^5',
                  'value.stream.metadata.description^2',
                ],
              },
            },
          },
        },
        { // Name
          multi_match: {
            query         : query.s.trim(),
            type          : 'phrase_prefix',
            slop          : 5,
            max_expansions: 50,
            fields        : [
              'name^4',
            ],
          },
        },
      ],
    },
  };
};

function getFilters (input) {
  var filters = [];
  var bidStateFilter = {'bool': {'must_not': {'match': { 'bid_state': 'Accepted' }}}};
  if (input.nsfw === 'true' || input.nsfw === 'false') {
    const nsfwFilter = {'match': {'value.stream.metadata.nsfw': input.nsfw}};
    filters.push(nsfwFilter);
  }
  if (input.contentType !== undefined) {
    const contentTypes = input.contentType.split(',');
    const contentFilter = {'terms': {'value.stream.source.contentType.keyword': contentTypes}};
    filters.push(contentFilter);
  }
  if (input.mediaType !== undefined) {
    const mediaTypes = input.mediaType.split(',');
    const possibleTypes = ['audio', 'video', 'text', 'application', 'image'];
    const shouldQueries = [];
    for (var i = 0; i < mediaTypes.length; i++) {
      if (possibleTypes.includes(mediaTypes[i])) {
        const mediaFilter = {'prefix': {'value.stream.source.contentType.keyword': mediaTypes[i] + '/'}};
        shouldQueries.push(mediaFilter);
      } else if (mediaTypes[i] === 'cad') {
        const cadTypes = ['SKP', 'simplify3d_stl'];
        const cadFilter = {'terms': {'value.stream.source.contentType.keyword': cadTypes}};
        shouldQueries.push(cadFilter);
      }
    }
    if (shouldQueries.length === 0) {
      const noneFilter = {'match_none': {}};
      filters.push(noneFilter);
    } else {
      const mediaTypeFilter = {'bool': {'should': shouldQueries}};
      filters.push(mediaTypeFilter);
    }
  }
  if (input.claimType === 'channel' || input.claimType === 'file') {
    var query = '';
    if (input.claimType === 'channel') {
      query = 'certificateType';
    } else if (input.claimType === 'file') {
      query = 'streamType';
    }
    const claimTypeFilter = {'match': {'value.claimType': query}};
    filters.push(claimTypeFilter);
  }
  if (filters.length > 0) {
    const filterQuery = [
      {
        'nested': {
          'path' : 'value',
          'query': {
            'bool': {
              'must': filters,
            },
          },
        },
      },
      bidStateFilter];
    return filterQuery;
  }  else {
    return [bidStateFilter];
  }
}

function getAutoComplete (query) {
  return eclient.search({
    index             : getIndex(query) || 'claims',
    routing           : getRoutingKey(query),
    ignore_unavailable: true, // ignore error when date index does not exist
    body              : {
      size : query.size || 10,
      from : query.from || 0,
      query: {
        bool: {
          must  : getAutoCompleteQuery(query),
          filter: getFilters(query),
        },
      },
    },
    size: query.size,
    from: query.from,
  });
}

function getStatus () {
  return new Promise((resolve, reject) => {
    rp(`http://localhost:9200/claims/_stats`)
      .then(function (data) {
        data = JSON.parse(data);
        resolve({status: getStats().info, spaceUsed: pretty(data._all.total.store.size_in_bytes, true), claimsInIndex: data._all.total.indexing.index_total, totSearches: data._all.total.search.query_total});
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

function getWashedQuery (query) {
  // compress multiple white spaces to 1
  query = query.toLowerCase().replace(/ +/g, ' ').replace('lbry://', '');
  let splitBy = ['&', '$', ' '];
  let regex = new RegExp(splitBy.join('|'), 'gi');
  let badWords  = [ 'from', 'with', 'not', 'can', 'all', 'are', 'for', 'but', 'and', 'the' ];
  let words = query.split(regex);
  let sentence = [];
  words.forEach(w => {
    if (!badWords.includes(w))      { sentence.push(w) }
  });
  query = sentence.join(' ');

  // remove all words < 3 in length
  return query.replace(/((\s|^)\b(\w{1,2})\b)/g, '').trim();
}

function getEscapedQuery (query) {
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
  // The reserved characters are: + - = && || > < ! ( ) { } [ ] ^ " ~ * ? : \ /
  let badCharacters  = ['+', '-', '=', '&&', '||', '>', '<', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', '*', '?', ':', '\\', '/'];
  let escapedQuery = '';
  for (var i = 0; i < query.length; i++) {
    let char1 = query.charAt(i);
    if (badCharacters.includes(char1)) {
      escapedQuery = escapedQuery + '\\' + char1;
    } else if (i + 1 <= query.length) {
      let char2 = query.charAt(i + 1);
      if (badCharacters.includes(char1 + char2)) {
        escapedQuery = escapedQuery + '\\' + char1 + char2;
        i++;
      } else {
        escapedQuery = escapedQuery + char1;
      }
    } else {
      escapedQuery = escapedQuery + char1;
    }
  }
  return escapedQuery;
}

async function update () {
  const shell = require('shelljs');
  shell.exec('cd ~ && ./update.sh');
}

class LighthouseControllers {
  /* eslint-disable no-param-reassign */
  // Start syncing blocks...
  startSync () {
    winston.log('info', '[Importer] Started importer, indexing claims.');
    claimSync();
    // sync(); // Old Sync
  }
  /**
   * Search API Endpoint.
   * @param {ctx} Koa Context
   */
  async search (ctx) {
    await getResults(ctx.query).then(function (result) {
      let results = result.hits.hits;
      let cResults = [];
      for (let pResult of results) {
        cResults.push(pResult._source);
      }
      ctx.body = cResults;
    });
  }

  /**
   * Autocomplete API Endpoint.
   * @param {ctx} Koa Context
   */
  async autoComplete (ctx) {
    await getAutoComplete(ctx.query).then(function (result) {
      let results = result.hits.hits;
      let cResults = [];
      for (let pResult of results) {
        var name = pResult._source.name;
        if (name.indexOf(ctx.query.s.trim()) > -1 && name.indexOf('http') === -1) {
          cResults.push(name);
        }
        if (pResult._source.value &&
            pResult._source.value.stream &&
            pResult._source.value.stream !== undefined) {
          var title = pResult._source.value.stream.metadata.title;
          var author = pResult._source.value.stream.metadata.author;
          if (title.indexOf(ctx.query.s.trim()) > -1 && title.indexOf('http') === -1) {
            cResults.push(title);
          }
          if (author.indexOf(ctx.query.s.trim()) > -1 && author.indexOf('http') === -1) {
            cResults.push(author);
          }
        }
      }

      var clean = [];
      for (var i = 0; i < cResults.length; i++) {
        if (cResults[i] && cResults[i].length > 3 && clean.indexOf(cResults[i]) === -1) {
          clean.push(cResults[i]);
        }
      }

      ctx.body = clean;
    });
  }
  /**
   * Info about the api here
   * @param {ctx} Koa Context
   */
  async info (ctx) {
    ctx.redirect('https://github.com/lbryio/lighthouse');
  }

  /**
   * Status of the api here
   * @param {ctx} Koa Context
   */
  async status (ctx) {
    ctx.body = await getStatus();
  }

  /**
   * AutoUpdate updates the application from the master branch.
   * @param {ctx} Koa Context
   */
  async autoUpdate (ctx) {
    let travisSignature = Buffer.from(ctx.request.headers.signature, 'base64');
    let payload = ctx.request.body.payload;
    let travisResponse  = await got('https://api.travis-ci.com/config', {timeout: 10000});
    let travisPublicKey = JSON.parse(travisResponse.body).config.notifications.webhook.public_key;
    let verifier = crypto.createVerify('sha1');
    verifier.update(payload);
    let status = verifier.verify(travisPublicKey, travisSignature);
    if (status) {
      let notification = JSON.parse(payload);
      if (notification.branch === 'master') {
        if (!notification.pull_request) {
          logToSlack('Auto Updating Lighthouse - ' + notification.message);
          update();
          ctx.body = 'OK';
        } else {
          ctx.status = 400;
          ctx.body = 'skip auto update: pull request'; logToSlack(ctx.body);
        }
      } else {
        ctx.status = 400;
        ctx.body = 'skip auto update: only deploys on master branch'; logToSlack(ctx.body);
      }
    } else {
      ctx.status = 500;
      ctx.body = 'skip auto update: could not verify webhook'; logToSlack(ctx.body);
    }
  }

  /* eslint-enable no-param-reassign */
}

export default new LighthouseControllers();
