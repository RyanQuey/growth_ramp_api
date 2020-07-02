# growth_ramp

A [Sails](http://sailsjs.org) application. See demo videos [here](https://www.youtube.com/playlist?list=PLGiO0wyxB_OnIQRe9CHlcafq34EdkGoD_).


# Setup Development Environment

## Prerequisites: 
Running on Node 8

- If using nvm, use `nvm use`

## Install packages:
`npm install`

If you like yarn, can do that too. Sometimes `yarn install` actually works better. If so, make sure to install [yarn](https://classic.yarnpkg.com/en/docs/install/#debian-stable) first and then do `yarn install`

## Set Env Vars
`cp config/local.js.example local.js`

Then fill them all in. Should use same api keys and stuff that we got when setting up growth ramp client server

## Make sure server has PG already setup and running
- Running PG version 10
- Enter PG: 
    `sudo -i -u postgres`
    `psql`

    Create a db based on `config/connections.js`, which itself is based on `config/local.js`
    `CREATE DATABASE growth_ramp_api;`
    Create a password for whatever user (probably in dev, just `postgres`) you want to use
    `ALTER USER postgres WITH PASSWORD 'new_password';`

    Then exit out:
    `\q`

    And switch back to normal user:
    `exit`

## Setup DB
- Install knex CLI: `npm install knex -g`
- `npm start` if want to also start the local server (does not live reload)
- To just run migrations do `knex migrate:latest`. 
    Should return something like `Batch 1 run: 43 migrations`

## Install global Nodemon for development (unless just want to run without live reload, and so without `npm run dev`)
`npm install -g nodemon`

## Run Local Server
`npm run dev`

## Get Google Oauth consent
- This app will need to have Google Analytics Reporting API enabled in Google cloud console
- Make sure to also allow those tokens in the [Oauth consent screen page](https://console.developers.google.com/apis/credentials/consent/edit) 

## If you want to use Facebook, Twitter, and LinkedIn, need to apply for those developer accounts as well
- Our Demo is not supporting any social media platform apart from Google, however.


# Deploy
`npm run deploy`

# Released under MIT License

Copyright (c) 2020 Ryan Quey.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
