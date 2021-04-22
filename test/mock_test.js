const rimraf = require("rimraf");
const path = require('path');
const fs = require('fs');
const assert = require('assert');

Feature('Mocking');

const defaultTimeout = 5;
const readmeURL = 'https://raw.githubusercontent.com/Netflix/pollyjs/master/README.md';

const openReadmeButton = {css: '[href="#/README"]'};



Scenario('change statusCode @Puppeteer @WebDriver',async ({I}) => {
  await I.mockRequest('GET', readmeURL, 404);
  await I.amOnPage('/');
  
  await I.waitForVisible(openReadmeButton, defaultTimeout);
  await I.click(openReadmeButton);
  await I.waitForText('404 - Not found', defaultTimeout, '#main');
  await I.stopMocking();
});

Scenario('change response data @Puppeteer @WebDriver', async ({I}) => {
  await I.mockRequest('GET', readmeURL, 'This is modified from mocking');
  await I.amOnPage('/');
  await I.waitForVisible(openReadmeButton, defaultTimeout);
  await I.click(openReadmeButton);
  await I.waitForText('This is modified from mocking', defaultTimeout, '#main');
  await I.stopMocking();
});

Scenario('change response data via mockServer @Puppeteer @WebDriver', async ({I}) => {
  await I.mockServer(server => {
    server.get(readmeURL).intercept((req, res) => {
      res.status(200).json('This is modified from mocking');
    });
  }); 
  await I.amOnPage('/');
  await I.waitForVisible('[class="cover-main"]', defaultTimeout);
  await I.waitForVisible(openReadmeButton, defaultTimeout);
  await I.click(openReadmeButton);
  await I.waitForText('This is modified from mocking', defaultTimeout, '#main');
  await I.stopMocking();
});

xScenario('record & replay request @Puppeteer', { retries: 3 }, async ({I}) => {
  rimraf.sync(path.join(__dirname, '../data'));
  I.amOnPage('/form/fetch_call');
  I.startMocking('comments', { mode: 'record' });

  I.click('GET COMMENTS');
  I.wait(3);
  I.waitForElement(locate('#data').find('tr').at(4), 10);
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



xScenario('change response data for multiple requests @Puppeteer @WebDriver', ({I}) => {
  I.amOnPage('/form/fetch_call');
  I.mockRequest(
    'GET',
    [
      'https://jsonplaceholder.typicode.com/posts/',
      'https://jsonplaceholder.typicode.com/comments/',
      'https://jsonplaceholder.typicode.com/users/',
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
  ({I}) => {
    I.amOnPage('/form/fetch_call');
    I.mockRequest('GET', 'https://jsonplaceholder.typicode.com/', {
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
