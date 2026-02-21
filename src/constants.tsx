
import type { CrimeCase, LeaderboardEntry } from '../types';


export const CASES: CrimeCase[] = [
  {
    id: 'harrow-enigma',
    title: 'The Harrow Enigma',
    subtitle: 'A Locked Room Mystery',
    teaser: 'A real estate tycoon is found dead in his study, locked from the inside.',
    difficulty: 'Medium',
    backgroundImage: 'https://images.unsplash.com/photo-1680430491786-ae96e04e70e8?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    victim: 'Daniel Harrow',
    description: 'Daniel Harrow was found dead. The gun was in his left hand, but he was right-handed. The door was locked from the inside using a hidden mechanism.',
    killerId: 'thomas',
    solutionSecret: 'Thomas used a thin fishing line found in the desk to pull the door shut and lock it from the hallway. He then "broke down the door" to hide the evidence of the line.',
    suspects: [
      { id: 'clara', name: 'Clara Harrow', role: 'The Wife', description: 'Disinherited in the new will.', motive: 'Money and resentment.', alibi: 'Bath upstairs.', imageUrl: 'https://picsum.photos/seed/clara/400/500' },
      { id: 'thomas', name: 'Thomas Harrow', role: 'The Brother', description: 'The sole beneficiary of the new will.', motive: 'Inheritance.', alibi: 'Watching TV.', imageUrl: 'https://picsum.photos/seed/thomas/400/500' }
    ],
    clues: [
      { id: 'left_hand', title: 'Wrong Hand', description: 'Gun in the wrong hand.', icon: 'fa-hand-pointer' },
      { id: 'fishing_line', title: 'Fishing Line', description: 'Used to lock the door.', icon: 'fa-lines-leaning' }
    ],
    timeline: [
      { time: '10:05 PM', event: 'Body discovered.' }
    ],
    accessLevel: 'Free'
  },
  {
    id: 'vineyard-vendetta',
    title: 'Vineyard Vendetta',
    subtitle: 'The Poisoned Vintage',
    teaser: 'The patriarch of the Rossi wine empire dies mid-toast.',
    difficulty: 'Medium',
    backgroundImage: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80',
    victim: 'Lorenzo Rossi',
    description: 'Lorenzo collapsed after drinking his private reserve. The bottle was sealed, and he was the one who opened it.',
    killerId: 'bianca',
    solutionSecret: 'Bianca poisoned the ice cubes in the bucket, not the wine itself. As the ice melted in his glass, the toxin was released.',
    suspects: [
      { id: 'bianca', name: 'Bianca Rossi', role: 'The Daughter', description: 'Wants to modernize the winery; Lorenzo refused.', motive: 'Control of the empire.', alibi: 'Serving guests at the buffet.', imageUrl: 'https://picsum.photos/seed/bianca/400/500' },
      { id: 'enzo', name: 'Enzo Valli', role: 'The Rival', description: 'Owner of the neighboring estate.', motive: 'Land dispute.', alibi: 'Talking to the Mayor.', imageUrl: 'https://picsum.photos/seed/enzo/400/500' }
    ],
    clues: [
      { id: 'blue_ice', title: 'Tainted Ice', description: 'Melted water in the bucket tested positive for hemlock.', icon: 'fa-ice-cream' },
      { id: 'empty_vial', title: 'The Vial', description: 'Found in the garden compost.', icon: 'fa-flask' }
    ],
    timeline: [{ time: '8:30 PM', event: 'The first toast is poured.' }],
    accessLevel: 'Free'
  },
  {
    id: 'phantom-opera',
    title: 'The Phantom of the Opera House',
    subtitle: 'A Masked Murder',
    teaser: "A diva's final performance ends in tragedy backstage.",
    difficulty: 'Hard',
    backgroundImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&q=80',
    victim: 'Isabelle Moreau',
    description: 'Isabelle Moreau, the opera\'s star soprano, was found murdered in her dressing room. The door was bolted from the inside, and a single red rose lay on her vanity. There are rumors of a "Phantom" haunting the rafters.',
    killerId: 'rival',
    solutionSecret: 'The "rival" baritone Lucian Vane used a secret stage trapdoor located behind the dressing room mirror—a mechanism used for quick costume changes—to enter and exit. He bolted the main door from the inside before leaving through the trapdoor and left the rose to stage the crime as the work of the legendary Phantom.',
    suspects: [
      { 
        id: 'rival', 
        name: 'Lucian Vane', 
        role: 'The Rival Baritone', 
        description: 'A talented singer who has lived in Isabelle\'s shadow for years.', 
        motive: 'Professional jealousy; he believed he was destined for the lead role.', 
        alibi: 'Claimed to be practicing in the basement rehearsal hall alone.', 
        imageUrl: 'https://picsum.photos/seed/lucian/400/500' 
      },
      { 
        id: 'manager', 
        name: 'Monsieur Richard', 
        role: 'The Opera Manager', 
        description: 'Heavily in debt and desperate for a successful season.', 
        motive: 'Insurance fraud; Isabelle\'s life was insured for a fortune.', 
        alibi: 'In his office checking the night\'s receipts.', 
        imageUrl: 'https://picsum.photos/seed/richard/400/500' 
      }
    ],
    clues: [
      { id: 'red_rose', title: 'The Red Rose', description: 'A fresh cut rose, thorns removed. Traditionally left by the Phantom.', icon: 'fa-leaf' },
      { id: 'trapdoor_oil', title: 'Hinge Oil', description: 'Trace amounts of industrial watch oil found on the floor near the mirror.', icon: 'fa-oil-can' },
      { id: 'stage_plans', title: 'Old Blueprints', description: 'Blueprints showing forgotten service tunnels connecting the dressing rooms.', icon: 'fa-scroll' }
    ],
    timeline: [
      { time: '8:45 PM', event: 'Isabelle finishes her second act aria.' },
      { time: '9:10 PM', event: 'Isabelle returns to her dressing room alone.' },
      { time: '9:30 PM', event: 'A muffled scream is heard by a stagehand.' },
      { time: '10:00 PM', event: 'Isabelle found by Monsieur Richard.' }
    ],
    accessLevel: 'Expert'
  },
  {
    id: 'silicon-secret',
    title: 'The Silicon Secret',
    subtitle: 'High-Tech Sabotage',
    teaser: 'A robotics CEO is electrocuted in a water-sealed server room.',
    difficulty: 'Hard',
    backgroundImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80',
    victim: 'Dr. Aris Thorne',
    description: 'Dr. Thorne was found dead in the server room. The high-voltage floor tiles were activated remotely.',
    killerId: 'mira',
    solutionSecret: 'Mira used a remote hacking device to spoof Aris\'s biometrics using a high-resolution 3D-printed glove and heat-sync technology.',
    suspects: [
      { id: 'mira', name: 'Mira Chen', role: 'Chief Engineer', description: 'Brilliant but felt Thorne stole her patents.', motive: 'Intellectual property theft.', alibi: 'Calibrating a robot in Lab B.', imageUrl: 'https://picsum.photos/seed/mira/400/500' },
      { id: 'jax', name: 'Jax Miller', role: 'Investor', description: 'Pressuring Thorne to sell to a defense contractor.', motive: 'Financial desperation.', alibi: 'In a board meeting.', imageUrl: 'https://picsum.photos/seed/jax/400/500' }
    ],
    clues: [
      { id: '3d_printer', title: 'Residue', description: 'Glove residue found near the panel.', icon: 'fa-print' }
    ],
    timeline: [{ time: '2:00 AM', event: 'Power surge detected.' }],
    accessLevel: 'Premium'
  },
  {
    id: 'alpine-alibi',
    title: 'The Alpine Alibi',
    subtitle: 'Death at High Altitude',
    teaser: 'A champion skier is found dead at the bottom of a ravine.',
    difficulty: 'Hard',
    backgroundImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80',
    victim: 'Sven Lindberg',
    description: 'Sven fell 500 feet. The safety cable was sliced clean during a blizzard.',
    killerId: 'katarina',
    solutionSecret: 'Katarina used a high-powered drone equipped with a heated ceramic blade to cut the cable from the lodge balcony.',
    suspects: [
      { id: 'katarina', name: 'Katarina Volkov', role: 'The Coach', description: 'Blamed Sven for her failed career.', motive: 'Professional jealousy.', alibi: 'Sleeping in her room.', imageUrl: 'https://picsum.photos/seed/katarina/400/500' }
    ],
    clues: [{ id: 'drone_battery', title: 'Battery', description: 'High-capacity drone battery in snow.', icon: 'fa-battery-full' }],
    timeline: [{ time: '11:00 PM', event: 'Sven leaves lodge.' }],
    accessLevel: 'Premium'
  },
  {
    id: 'midnight-gallery',
    title: 'The Midnight Gallery',
    subtitle: 'The Stolen Masterpiece',
    teaser: 'A priceless Vermeer vanishes. The guard is dead.',
    difficulty: 'Hard',
    backgroundImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80',
    victim: 'Officer Marcus Reed',
    description: 'Officer Reed was killed by a blunt object. The painting "The Girl in the Window" is gone.',
    killerId: 'julian',
    solutionSecret: 'Julian used a replica painting to swap the real one. Marcus caught him, and Julian struck him with a heavy bronze pedestal.',
    suspects: [
      { id: 'sophia', name: 'Sophia Sterling', role: 'Curator', description: 'Under pressure to save the failing museum.', motive: 'Insurance fraud.', alibi: 'Giving a speech.', imageUrl: 'https://picsum.photos/seed/sophia/400/500' },
      { id: 'julian', name: 'Julian Vane', role: 'The Artist', description: 'A master forger.', motive: 'Reclaiming family heritage.', alibi: 'On the balcony.', imageUrl: 'https://picsum.photos/seed/vane/400/500' }
    ],
    clues: [{ id: 'pedestal', title: 'Bronze Pedestal', description: 'The murder weapon, wiped clean.', icon: 'fa-monument' }],
    timeline: [{ time: '12:15 AM', event: 'Guard found.' }],
    accessLevel: 'Expert'
  },
  {
    id: 'obsidian-orchid',
    title: 'The Obsidian Orchid',
    subtitle: 'A Noir Nightmare',
    teaser: 'A private eye is killed in his own office with a weapon he never used.',
    difficulty: 'Hard',
    backgroundImage: 'https://images.unsplash.com/photo-1620710204537-7d2ddcd39d0c?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    victim: 'Jack Spade',
    description: 'Spade was killed by a .38 caliber bullet. His own gun was a .45. The office was locked from the outside.',
    killerId: 'lila',
    solutionSecret: 'Lila hid in the shadows of the coat rack, shot him, then slipped out through the transom window which only she knew didn\'t lock.',
    suspects: [
      { id: 'lila', name: 'Lila Fontaine', role: 'The Client', description: 'Claims Spade was blackmailing her.', motive: 'Self-preservation.', alibi: 'At the Jazz Club.', imageUrl: 'https://picsum.photos/seed/lila/400/500' }
    ],
    clues: [{ id: 'transom', title: 'Open Window', description: 'Smudges found on the ceiling transom.', icon: 'fa-window-maximize' }],
    timeline: [{ time: '11:30 PM', event: 'Gunshot heard by neighbors.' }],
    accessLevel: 'Expert'
  }
];

export const LEADERBOARD_DATA: LeaderboardEntry[] = [
  { name: 'Detective Holmes', cases_solved: 42, points: 12500, badges: ['Gold Gavel', 'Master Mind', 'Night Owl'] },
  { name: 'Poirot\'s Ghost', cases_solved: 38, points: 11200, badges: ['The Grey Cell', 'Logic King'] }
];

export const BADGE_DEFINITIONS = [
  { name: 'Rookie Detective', description: 'Solve your first case.', icon: 'fa-shield-halved', color: 'text-blue-400' },
  { name: 'Swift Justice', description: 'Solve a case in under 10 messages.', icon: 'fa-bolt', color: 'text-yellow-400' },
  { name: 'Master Mind', description: 'Solve an Expert level case.', icon: 'fa-brain', color: 'text-purple-400' },
  { name: 'Elite Investigator', description: 'Solve 5 different mysteries.', icon: 'fa-scale-balanced', color: 'text-red-500' }
];
