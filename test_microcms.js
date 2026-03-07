const { createClient } = require('microcms-js-sdk');

const domain = "daitan3150no1-blog";
const apiKey = "WPmBoMwJKf1Tc5Rvdcb18PLIQMaJGZCNVPE1";

const client = createClient({
    serviceDomain: domain,
    apiKey: apiKey,
});

client.get({ endpoint: 'blogs' })
    .then(res => console.log('Success:', res.totalCount))
    .catch(err => console.error('Error:', err.message));
