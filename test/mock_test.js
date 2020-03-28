const rimraf = require("rimraf");
const path = require('path');
const fs = require('fs');
const assert = require('assert');

Feature('Mocking');

const fetchPost = response => response.url() === 'https://jsonplaceholder.typicode.com/posts/1';

const fetchComments = response => response.url() === 'https://jsonplaceholder.typicode.com/comments/1';

const fetchUsers = response => response.url() === 'https://jsonplaceholder.typicode.com/users/1';

Scenario('change statusCode @Puppeteer @WebDriver', (I) => {
  I.amOnPage('/form/fetch_call');
  I.mockRequest('GET', 'https://jsonplaceholder.typicode.com/*', 404);
  I.click('GET POSTS');
  I.waitForText('Can not load data!', 1, '#data');
  I.stopMocking();
});

Scenario('change response data @Puppeteer @WebDriver', (I) => {
  I.amOnPage('/form/fetch_call');
  I.mockRequest('GET', 'https://jsonplaceholder.typicode.com/*', {
    modified: 'This is modified from mocking',
  });
  I.click('GET COMMENTS');
  I.waitForText('This is modified from mocking', 1, '#data');
  I.stopMocking();
});

Scenario('change response data via mockServer @Puppeteer @WebDriver', (I) => {
  I.amOnPage('/form/fetch_call');
  I.mockServer(server => {
    server.get('https://jsonplaceholder.typicode.com/*').intercept((req, res) => {
      res.status(200).json({ modified: 'This is modified from mocking' });
    });
  }); 
  I.click('GET COMMENTS');
  I.waitForText('This is modified from mocking', 1, '#data');
  I.stopMocking();
});

Scenario('record & replay request @Puppeteer', async (I) => {
  rimraf.sync(path.join(__dirname, '../data'));
  I.amOnPage('/form/fetch_call');
  I.startMocking('comments', { mode: 'record' });

  I.click('GET COMMENTS');
  I.wait(1);
  let email = await I.grabTextFrom(locate('#data').find('tr').at(4).find('td').at(2));
  await I.stopMocking();
  assert(fs.existsSync(path.join(__dirname, '../data/requests')), 'recording created');

  I.amOnPage('/form/fetch_call');
  I.startMocking('comments', { mode: 'replay' });
  I.click('GET COMMENTS');
  I.stopMocking();

  let newEmail = await I.grabTextFrom(locate('#data').find('tr').at(4).find('td').at(2));
  assert.equal(email, newEmail, 'data was not replayed');

});



Scenario('change response data for multiple requests @Puppeteer @WebDriver', (I) => {
  I.amOnPage('/form/fetch_call');
  I.mockRequest(
    'GET',
    [
      'https://jsonplaceholder.typicode.com/posts/*',
      'https://jsonplaceholder.typicode.com/comments/*',
      'https://jsonplaceholder.typicode.com/users/*',
    ],
    {
      modified: 'MY CUSTOM DATA',
    },
  );
  I.click('GET POSTS');
  I.waitForText('MY CUSTOM DATA', 1, '#data');
  I.click('GET COMMENTS');
  I.waitForText('MY CUSTOM DATA', 1, '#data');
  I.click('GET USERS');
  I.waitForText('MY CUSTOM DATA', 1, '#data');
  I.stopMocking();
});

// we should replace it with other service - https://jsonplaceholder.typicode.com not works
xScenario(
  'should request for original data after mocking stopped @Puppeteer @WebDriver',
  (I) => {
    I.amOnPage('/form/fetch_call');
    I.mockRequest('GET', 'https://jsonplaceholder.typicode.com/*', {
      comment: 'CUSTOM _uniqueId_u4805sd23',
    });
    I.click('GET COMMENTS');
    I.waitForText('_uniqueId_u4805sd23', 1, '#data');
    I.stopMocking();
    pause();

    I.click('GET COMMENTS');
    I.waitForText('laudantium', 10);
    I.dontSee('_uniqueId_u4805sd23', '#data');
  },
);
