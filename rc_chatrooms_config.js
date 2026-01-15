window.RC_CHATROOMS = {
  longboard: {
    name: "Longboard",
    subrealms: ["dancing", "cruising", "downhill", "freestyle"],
    rooms: [
      { id: "lb_dancing", name: "Dancing Floor", type: "public" },
      { id: "lb_cruise", name: "Cruise Lane", type: "public" },
      { id: "lb_downhill", name: "Downhill Line", type: "public" },
      { id: "lb_freestyle", name: "Freestyle Lab", type: "public" },
      { id: "lb_gear", name: "Gear Talk", type: "public" }
    ],
    voice: [
      { id: "lb_voice_dance", name: "🎧 Live Dance Session" },
      { id: "lb_voice_downhill", name: "🎧 Downhill Coaching" }
    ]
  },

  blades: {
    name: "Blades",
    subrealms: ["urban", "slalom", "speed", "aggressive"],
    rooms: [
      { id: "bl_urban", name: "Urban Flow Line", type: "public" },
      { id: "bl_slalom", name: "Slalom Cones", type: "public" },
      { id: "bl_speed", name: "Speed Track", type: "public" },
      { id: "bl_aggressive", name: "Aggressive Rail", type: "public" },
      { id: "bl_gear", name: "Blade Gear", type: "public" }
    ],
    voice: [
      { id: "bl_voice_slalom", name: "🎧 Slalom Coaching" },
      { id: "bl_voice_urban", name: "🎧 Urban Night Ride" }
    ]
  },

  quads: {
    name: "Quads",
    subrealms: ["rink", "jam", "outdoor", "speed"],
    rooms: [
      { id: "qd_rink", name: "Rink Rhythm", type: "public" },
      { id: "qd_outdoor", name: "Outdoor Rink", type: "public" },
      { id: "qd_jam", name: "Jam Circle", type: "public" },
      { id: "qd_speed", name: "Speed Jam", type: "public" },
      { id: "qd_gear", name: "Quad Gear", type: "public" }
    ],
    voice: [
      { id: "qd_voice_dj", name: "🎧 Rink DJ Booth" },
      { id: "qd_voice_outdoor", name: "🎧 Outdoor Meetup Voice" }
    ]
  },

  skateboard: {
    name: "Skateboard",
    subrealms: ["street", "park", "vert", "tricklab"],
    rooms: [
      { id: "sk_street", name: "Street Spot", type: "public" },
      { id: "sk_park", name: "Park Plaza", type: "public" },
      { id: "sk_vert", name: "Vert Ramp", type: "public" },
      { id: "sk_tricklab", name: "Trick Lab", type: "public" },
      { id: "sk_gear", name: "Skate Gear", type: "public" }
    ],
    voice: [
      { id: "sk_voice_park", name: "🎧 Park Session Live" },
      { id: "sk_voice_street", name: "🎧 Street Mission Voice" }
    ]
  },

  virtual: {
    name: "Virtual Skate Park",
    subrealms: ["main", "beginner", "clips", "gear", "events"],
    rooms: [
      { id: "vs_main", name: "Main Park", type: "public" },
      { id: "vs_beginner", name: "Beginner Zone", type: "public" },
      { id: "vs_clips", name: "Clip Exchange", type: "public" },
      { id: "vs_gear", name: "Gear Universe", type: "public" },
      { id: "vs_events", name: "Event Hub", type: "public" }
    ],
    voice: [
      { id: "vs_voice_park", name: "🎧 Park Voice Chat" },
      { id: "vs_voice_coach", name: "🎧 Coaching Voice" }
    ]
  }
};
