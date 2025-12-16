export const playWord = (play: string) => ({
    type: 'PLAY_WORD',
    meta: {
      sound: {
        play,
      }
    }
  })
