// English copy. Use {placeholders} for data values. Period-dependent lines live under last12 / year / allTime.
export const en = {
  appName: "Watchback", // working name; swap if vedrico picks another
  disclaimer: "Not affiliated with YouTube or Google.",

  landing: {
    headline: {
      last12: "Your last 12 months on YouTube, played back.",
      year: "Your {year} on YouTube, played back.",
      allTime: "Your all-time YouTube, played back.",
    },
    sub: "See who you watched, what you replayed, and when you couldn't stop.",
    cta: "Get started",
    privacyLine: "Your file never leaves your device.",
  },

  privacy: {
    body: "Your Takeout file is read in your browser and never uploaded. Only video IDs leave your device, to look up video lengths and load thumbnails through our own server, so Google never sees who's asking. No account, no tracking, nothing saved. Close the tab and it's gone.",
  },

  upload: {
    dropzone: "Drop your Takeout .zip here",
    dropzoneAlt: "or tap to choose a file",
    cassetteLabel: ".ZIP",
    badge: "Processed on your device",
    intro: "Bring your history. We'll do the math.",
    stepsTitle: "Get your file from Google Takeout",
    steps: [
      "Go to takeout.google.com and tap Deselect all.",
      "Scroll to YouTube and YouTube Music and tick it.",
      "Tap All YouTube data included and leave only history ticked. It makes the file much smaller.",
      "Tap Multiple formats and set History to JSON. HTML works too, but JSON is faster.",
      "Tap Next step, choose Export once and .zip, then Create export.",
      "Google emails you when it's ready, which can take a few minutes or a few hours. Download the .zip and drop it here. No need to unzip it.",
    ],
    takeoutUrl: "https://takeout.google.com",
  },

  crunching: {
    counter: "Counting {n} videos…",
    rotating: [
      "Rewinding the tape…",
      "Finding your 3 AM rabbit holes…",
      "Tallying rewatches…",
      "Labeling the cassettes…",
      "Trying not to judge…",
    ],
  },

  errors: {
    notTakeout: "That doesn't look like a Takeout .zip. Grab the one Google emailed you.",
    noHistory: "We couldn't find any watch history in there. Check that 'history' was ticked.",
  },

  periodSheet: {
    title: "Choose a period",
    last12: "Last 12 months",
    calendarYears: "Calendar years",
    allTime: "All time",
    close: "Close",
  },

  shareCard: {
    videos: "Videos",
    watchTime: "Watch time",
    topCreators: "Top creators",
    topSong: "Top song",
    topCreator: "#1 creator",
    hours: "hours",
    perDay: "≈ {perDay} a day",
    plays: "{n} plays",
  },

  period: {
    last12: "{startMonth} – {endMonth}",
    year: "{year}",
    allTime: "All time",
  },

  // Story player hints and accessible labels
  player: {
    tapToContinue: "Tap to continue", // shown when reduced motion stops auto-advance
    firstSlideHint: "Tap right for next, left to go back. Hold to pause.",
    keyboardHint: "Use ← and → to move, space to pause.",
    ariaNext: "Next slide",
    ariaPrev: "Previous slide",
    ariaPause: "Pause",
    ariaPlay: "Play",
    ariaProgress: "Slide {current} of {total}",
    periodPillAria: "Change time period, currently {period}",
  },

  // Decorative labels (Paper Mixtape). Keep each to 1-3 words.
  deco: {
    takeoutTape: "Liner notes · 6 steps",
    runnersUp: "Side B · Runners-up",
    vhsLabel: "T-120",
    vhsRec: "REC",
    heatmapArrow: "prime time!",
    shareStamp: "WATCHBACK",
    nowPlaying: "Now playing",
    streakSticker: "No skips",
  },

  slides: {
    totalVideos: {
      headline: "You pressed play on {n} videos.",
      sub: "That's about {perDay} a day.",
    },
    watchTime: {
      headline: "≈ {hours} hours of watching.",
      sub: "That's {days} full days.",
      chip: "Estimate",
      chipExplainer: "We looked up the lengths of your most-played videos plus a random sample of the rest, assumed you watched each one to the end, and scaled that up to your whole history. Very long videos and livestreams count for 3 hours at most. Skips happen, so treat this as a ballpark.",
      unavailableTooltip: "Watch time is taking a break today. Try again tomorrow to see it.",
    },
    topCreator: {
      headline: "Your #1 creator was {creator}.",
      sub: "{n} videos. That's loyalty.",
    },
    topCreators: {
      headline: "Your top 5 creators, in heavy rotation",
      item: "{n} videos",
    },
    favoriteVideo: {
      headline: "You couldn't stop rewatching this one.",
      sub: "{title}, watched {n} times.", // single-line fallback
      title: "{title}", // clamped to 2 lines
      watchedTimes: "watched {n} times.",
      thumbAlt: "{title}",
    },
    busiestMonth: {
      headline: {
        last12: "{month} was your biggest month.",
        year: "{month} was your biggest month.",
        allTime: "{month} {year} was your biggest month.",
      },
      sub: "{n} videos in one month.",
    },
    primeTime: {
      headline: "Prime time: {day}s at {hour}.",
      heatmapHeader: "Day × hour · {tz}",
      sub: "That's when you hit play the most.",
      peakLabel: "Your peak hour",
      // One badge per person: the window with the most plays. Windows cover all 24 hours (start inclusive, end exclusive).
      badges: {
        earlyBird: "Early bird", // 5 AM to 9 AM
        coffeeBreak: "Coffee-break viewer", // 9 AM to 11 AM
        lunchBreak: "Lunch-break scroller", // 11 AM to 2 PM
        afternoonDrifter: "Afternoon drifter", // 2 PM to 6 PM
        eveningRegular: "Evening regular", // 6 PM to 10 PM
        nightOwl: "Night owl", // 10 PM to 5 AM
      },
      badgeShare: "{badge}, {pct}% of plays",
    },
    bingeStreak: {
      headline: "{n} days in a row.",
      sub: "Your longest streak, from {start} to {end}.",
    },
    topSearches: {
      headline: "You searched for these the most.",
      footer: "The rest stays between you and your search bar.",
    },
    music: {
      headline: "You played {n} songs on YouTube Music.",
      sub: "Most of them were by {artist}.",
    },
    topSongs: {
      headline: "Side A: your top 5 songs, on repeat.",
    },
    share: {
      headline: {
        last12: "That was your last 12 months.",
        year: "That was your {year}.",
        allTime: "That's your whole history.",
      },
      saveStory: "Save story",
      saveSquare: "Save square",
      startOver: "Start over",
    },
  },
} as const;
