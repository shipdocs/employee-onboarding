// Central export for all repositories
const userRepository = require('./userRepository');
const crewRepository = require('./crewRepository');
const trainingRepository = require('./trainingRepository');

module.exports = {
  userRepository,
  crewRepository,
  trainingRepository
};