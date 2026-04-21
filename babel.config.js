module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        [
          'module-resolver',
          {
            root: ['./'],
            alias: {
              '@': './app',
              '@components': './app/components',
              '@screens': './app/screens',
              '@hooks': './app/hooks',
              '@lib': './app/lib',
              '@store': './app/store',
              '@types': './app/types',
              '@constants': './app/constants',
            },
          },
        ],
      ],
    };
  };