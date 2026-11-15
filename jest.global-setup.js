// Run every test in one fixed time zone so date logic behaves the same on any machine.
// New York is a useful choice: it is behind UTC, so "UTC vs local date" bugs show up.
module.exports = async () => {
  process.env.TZ = 'America/New_York';
};
