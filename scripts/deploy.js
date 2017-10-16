#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const child_process = require('child_process'); // eslint-disable-line camelcase
const inquirer = require('inquirer');
const pkg = require('../package.json');

process.on('unhandledRejection', reason => console.log(reason));
(async function() {
  const currentVersion = pkg.version;

  console.log(`\nCurrent version: ${currentVersion}\n`);

  const nextVersion = await inquirer
    .prompt({
      name: 'bump',
      message: 'Which version part do you want to update?',
      type: 'list',
      choices: ['major', 'minor', 'patch'],
      default: 'patch'
    })
    .then(
      answers =>
        new Promise((resolve, reject) => {
          const [major, minor, patch] = currentVersion
            .split('.')
            .map(x => parseInt(x, 10));

          switch (answers.bump) {
            case 'major':
              resolve(`${major + 1}.${minor}.${patch}`);
              break;
            case 'minor':
              resolve(`${major}.${minor + 1}.${patch}`);
              break;
            case 'patch':
              resolve(`${major}.${minor}.${patch + 1}`);
              break;
            default:
              reject('Incorrect version bump');
          }
        })
    );

  await inquirer
    .prompt({
      name: 'shouldUpdateFiles',
      message: `Do you want to update all files to version ${nextVersion}?`,
      type: 'confirm',
      default: false
    })
    .then(
      ({shouldUpdateFiles}) =>
        new Promise((resolve, reject) => {
          if (!shouldUpdateFiles) return resolve();
          updatePackageConfig(nextVersion);
          updateBowerConfig(nextVersion);
          updateDocsConfig(nextVersion);
          updateSource(nextVersion);
          updateTest(nextVersion);
          resolve();
        })
    );

  await inquirer
    .prompt({
      name: 'shouldRunBuild',
      message: `Do you want to run the build process?`,
      type: 'confirm',
      default: false
    })
    .then(
      ({shouldRunBuild}) =>
        new Promise(resolve => {
          if (!shouldRunBuild) return resolve();
          runBuild();
          resolve();
        })
    );

  await inquirer
    .prompt({
      name: 'shouldCommitChanges',
      message: `Do you want to commit the changes?`,
      type: 'confirm',
      default: false
    })
    .then(
      ({shouldCommitChanges}) =>
        new Promise(resolve => {
          if (!shouldCommitChanges) return resolve();
          commitChanges(nextVersion);
          resolve();
        })
    );

  await inquirer
    .prompt({
      name: 'shouldCreateTag',
      message: `Do you want to create a tag?`,
      type: 'confirm',
      default: false
    })
    .then(
      ({shouldCreateTag}) =>
        new Promise(resolve => {
          if (!shouldCreateTag) return resolve();
          createTag(nextVersion);
          resolve();
        })
    );

  await inquirer
    .prompt({
      name: 'shouldPushChanges',
      message: `Do you want to push the changes?`,
      type: 'confirm',
      default: false
    })
    .then(
      ({shouldPushChanges}) =>
        new Promise(resolve => {
          if (!shouldPushChanges) return resolve();
          pushChanges();
          resolve();
        })
    );

  await inquirer
    .prompt({
      name: 'shouldPublishOnCdn',
      message: `Do you want to publish on CDN?`,
      type: 'confirm',
      default: false
    })
    .then(
      ({shouldPublishOnCdn}) =>
        new Promise(resolve => {
          if (!shouldPublishOnCdn) return resolve();
          publishOnCdn();
          resolve();
        })
    );

  await inquirer
    .prompt({
      name: 'shouldPublishOnNpm',
      message: `Do you want to publish on NPM?`,
      type: 'confirm',
      default: false
    })
    .then(
      ({shouldPublishOnNpm}) =>
        new Promise(resolve => {
          if (!shouldPublishOnNpm) return resolve();
          publishOnNpm();
          resolve();
        })
    );

  console.log(`\n✔ Deployment of Raven.js ${nextVersion} complete!\n`);
})();

function updatePackageConfig(nextVersion) {
  const filePath = path.join(__dirname, '../package.json');
  const originalData = require('../package.json');
  const data = Object.assign({}, originalData, {version: nextVersion});
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`✔ package.json updated`);
}

function updateBowerConfig(nextVersion) {
  const filePath = path.join(__dirname, '../bower.json');
  const originalData = require('../bower.json');
  const data = Object.assign({}, originalData, {version: nextVersion});
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`✔ bower.json updated`);
}

function updateDocsConfig(nextVersion) {
  const filePath = path.join(__dirname, '../docs/sentry-doc-config.json');
  const originalData = require('../docs/sentry-doc-config.json');
  const data = Object.assign({}, originalData, {
    vars: Object.assign({}, originalData.vars, {
      RAVEN_VERSION: nextVersion
    })
  });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`✔ docs/sentry-doc-config.json updated`);
}

function updateSource(nextVersion) {
  const filePath = path.join(__dirname, '../src/raven.js');
  const originalData = fs.readFileSync(filePath, 'utf8');
  const data = originalData.replace(
    /(VERSION: .)\d+\.\d+\.\d+(.)/g,
    `$1${nextVersion}$2`
  );
  fs.writeFileSync(filePath, data);
  console.log(`✔ src/raven.js updated`);
}

function updateTest(nextVersion) {
  const filePath = path.join(__dirname, '../test/raven.test.js');
  const originalData = fs.readFileSync(filePath, 'utf8');
  const data = originalData.replace(
    /(sentry_client: .raven-js\/)\d+\.\d+\.\d+(.)/g,
    `$1${nextVersion}$2`
  );
  fs.writeFileSync(filePath, data);
  console.log(`✔ test/raven.test.js updated`);
}

function execCommand(command) {
  try {
    console.log('Running command:', command);
    //child_process.execSync(command, {
    //  stdio: 'inherit'
    //})
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

function runBuild() {
  execCommand(`grunt dist`);
  console.log('✔ Build process completed');
}

function commitChanges(nextVersion) {
  execCommand(`git add -A && git commit -am "${nextVersion}"`);
  console.log('✔ Changes committed');
}

function createTag(nextVersion) {
  execCommand(`git tag -a ${nextVersion} -m "Version ${nextVersion}"`);
  console.log('✔ Tag created');
}

function pushChanges() {
  execCommand(`git push --follow-tags`);
  console.log('✔ Changes pushed');
}

function publishOnCdn() {
  execCommand(`grunt publish`);
  console.log('✔ Published on CDN');
}

function publishOnNpm() {
  execCommand(`npm publish`);
  console.log('✔ Published on NPM');
}
