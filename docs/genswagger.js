const swaggerJSDoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');
const options = {
  swaggerDefinition: {
    info: {
      title      : 'Lighthouse', // Title (required)
      version    : '1.0.0', // Version (required)
      description: 'This is the documentation for Lighthouse, LBRYs search engine server which handles searching on the LBRY blockchain.',
      contact    : {
        name: 'Lighthouse',
        url : 'https://github.com/lbryio/lighthouse',
      },
    },
  },
  apis: ['./server/routes/lighthouse.js'], // Path to the API docs
};
// Save down our swagger spec.
fs.writeFileSync(path.join(__dirname, 'swagger.json'), JSON.stringify(swaggerJSDoc(options)));
console.log('Generated swagger documentation.');
