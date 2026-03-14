import chalk from 'chalk';

const ALL_SERVICES = [
  'id',
  'doc',
  'vault',
  'pulse',
  'scope',
  'sync',
  'signal',
  'mart',
  'brain',
  'code',
];

export async function servicesList() {
  console.log('');
  console.log(chalk.cyan('Available Globio services:'));
  ALL_SERVICES.forEach((service) => {
    console.log('  ' + chalk.white(service));
  });
  console.log('');
  console.log(
    chalk.gray('Manage service access via console.globio.stanlink.online')
  );
  console.log('');
}
