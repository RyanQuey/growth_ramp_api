# growth_ramp

a [Sails](http://sailsjs.org) application

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

