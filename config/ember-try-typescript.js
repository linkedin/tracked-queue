module.exports = {
  useYarn: true,
  command: 'tsc --noEmit',
  scenarios: [
    {
      name: 'ts-4.1',
      npm: {
        typescript: '~4.1',
      },
    },
    {
      name: 'ts-4.2',
      npm: {
        typescript: '~4.2',
      },
    },
    {
      name: 'ts-next',
      npm: {
        devDependencies: {
          typescript: 'next',
        },
      },
    },
  ],
};
