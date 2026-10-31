export interface GameDef {
  id: string;
  currency: string;
  genre: string;
  publisher: string;
  popularity: number;
  tagline: string;
  color: string;
}

export interface GameGenre {
  label: string;
  games: GameDef[];
}

export const GAME_GENRES: GameGenre[] = [
  {
    label: 'Battle Royale & Shooters',
    games: [
      { id: 'PUBG Mobile', currency: 'UC', genre: 'Battle Royale & Shooters', publisher: 'Krafton', popularity: 98, tagline: '100 players, 1 winner — the original mobile battle royale', color: 'from-amber-500 to-orange-600' },
      { id: 'Free Fire', currency: 'Diamonds', genre: 'Battle Royale & Shooters', publisher: 'Garena', popularity: 95, tagline: 'Fast 10-minute matches, 50-player BR chaos', color: 'from-rose-500 to-red-600' },
      { id: 'Call of Duty: Mobile', currency: 'CP', genre: 'Battle Royale & Shooters', publisher: 'Activision', popularity: 90, tagline: 'Classic COD action with BR and multiplayer modes', color: 'from-slate-600 to-slate-800' },
      { id: 'Fortnite', currency: 'V-Bucks', genre: 'Battle Royale & Shooters', publisher: 'Epic Games', popularity: 88, tagline: 'Build, shoot, survive — the cultural phenomenon', color: 'from-blue-500 to-indigo-600' },
      { id: 'Apex Legends Mobile', currency: 'Crafting Metals', genre: 'Battle Royale & Shooters', publisher: 'EA', popularity: 75, tagline: 'Hero-based BR with unique character abilities', color: 'from-red-500 to-rose-700' },
      { id: 'Standoff 2', currency: 'Gold', genre: 'Battle Royale & Shooters', publisher: 'Axlebolt', popularity: 70, tagline: 'Tactical 5v5 FPS with ranked competitive play', color: 'from-stone-500 to-stone-700' },
    ],
  },
  {
    label: 'MOBA & Strategy',
    games: [
      { id: 'Mobile Legends: Bang Bang', currency: 'Diamonds', genre: 'MOBA & Strategy', publisher: 'Moonton', popularity: 92, tagline: '5v5 MOBA — the king of mobile esports in SEA', color: 'from-purple-500 to-violet-700' },
      { id: 'Clash of Clans', currency: 'Gems', genre: 'MOBA & Strategy', publisher: 'Supercell', popularity: 85, tagline: 'Build your village, crush your enemies', color: 'from-yellow-500 to-amber-600' },
      { id: 'Clash Royale', currency: 'Gems', genre: 'MOBA & Strategy', publisher: 'Supercell', popularity: 80, tagline: 'Real-time card battles and tower defense', color: 'from-cyan-500 to-blue-600' },
      { id: 'Nation of Darkness', currency: 'Gems', genre: 'MOBA & Strategy', publisher: 'Lilith', popularity: 60, tagline: 'Dark fantasy strategy with alliance warfare', color: 'from-indigo-600 to-slate-800' },
      { id: 'League of Legends: Wild Rift', currency: 'Wild Cores', genre: 'MOBA & Strategy', publisher: 'Riot Games', popularity: 82, tagline: 'The PC MOBA legend, reborn for mobile', color: 'from-emerald-500 to-teal-700' },
      { id: 'Arena of Valor', currency: 'Vouchers', genre: 'MOBA & Strategy', publisher: 'Garena', popularity: 65, tagline: '5v5 arena battles with 100+ heroes', color: 'from-sky-500 to-blue-700' },
    ],
  },
  {
    label: 'Sports & Racing',
    games: [
      { id: 'EA SPORTS FC Mobile', currency: 'FC Points', genre: 'Sports & Racing', publisher: 'EA', popularity: 78, tagline: 'The world\'s game in your pocket', color: 'from-green-500 to-emerald-700' },
      { id: 'eFootball', currency: 'eFootball Coins', genre: 'Sports & Racing', publisher: 'Konami', popularity: 65, tagline: 'Free-to-play football with global licenses', color: 'from-blue-600 to-cyan-700' },
      { id: 'Asphalt Legends Unite', currency: 'Tokens', genre: 'Sports & Racing', publisher: 'Gameloft', popularity: 60, tagline: 'Arcade racing with 150+ hypercars', color: 'from-orange-500 to-red-600' },
      { id: 'Rocket League Sideswipe', currency: 'Sideswipe Coins', genre: 'Sports & Racing', publisher: 'Epic Games', popularity: 55, tagline: 'Car soccer — 1v1 and 2v2 chaos', color: 'from-blue-500 to-sky-700' },
    ],
  },
  {
    label: 'Sandbox & Casual',
    games: [
      { id: 'Roblox', currency: 'Robux', genre: 'Sandbox & Casual', publisher: 'Roblox Corp', popularity: 96, tagline: 'Millions of player-made games in one app', color: 'from-slate-500 to-slate-700' },
      { id: 'Minecraft', currency: 'Minecoins', genre: 'Sandbox & Casual', publisher: 'Mojang', popularity: 90, tagline: 'Build, explore, survive — endless creativity', color: 'from-green-600 to-lime-700' },
      { id: 'Among Us', currency: 'Stars', genre: 'Sandbox & Casual', publisher: 'Innersloth', popularity: 68, tagline: 'Find the impostor before it\'s too late', color: 'from-rose-500 to-pink-700' },
    ],
  },
];

export const ALL_GAMES: GameDef[] = GAME_GENRES.flatMap((g) => g.games);

export function getGameCurrency(gameId: string): string {
  return ALL_GAMES.find((g) => g.id === gameId)?.currency ?? 'UC';
}

export function getGameDef(gameId: string): GameDef | undefined {
  return ALL_GAMES.find((g) => g.id === gameId);
}

export const COUNTRIES = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'GB', name: 'UK', flag: '🇬🇧' },
] as const;

export function getCountry(code: string): { code: string; name: string; flag: string } {
  return COUNTRIES.find((c) => c.code === code) ?? { code, name: code, flag: '🏳️' };
}

export const TOURNAMENTS: import('./types').Tournament[] = [
  { id: 'tour_br_weekly', title: 'Weekend BR Showdown', game: 'PUBG Mobile', format: 'squad', entryFee: 50, prizePool: 5000, maxPlayers: 100, registeredCount: 67, status: 'registration', startsAt: new Date(Date.now() + 3 * 864e5).toISOString(), description: '4-man squads battle across Erangel. Top 3 squads split the prize pool. Kill points count.' },
  { id: 'tour_ff_solo', title: 'Free Fire Solo Cup', game: 'Free Fire', format: 'solo', entryFee: 25, prizePool: 2000, maxPlayers: 50, registeredCount: 34, status: 'registration', startsAt: new Date(Date.now() + 5 * 864e5).toISOString(), description: 'Solo only — no squad play. 6 matches across Bermuda and Purgatory. Booyah or bust.' },
  { id: 'tour_cod_duo', title: 'COD Mobile Duo League', game: 'Call of Duty: Mobile', format: 'duo', entryFee: 40, prizePool: 3000, maxPlayers: 60, registeredCount: 28, status: 'upcoming', startsAt: new Date(Date.now() + 7 * 864e5).toISOString(), description: '2v2 ranked SnD + Domination. Best of 5 single elimination. Pro accounts get free entry.' },
  { id: 'tour_mlbb_5v5', title: 'MLBB 5v5 Championship', game: 'Mobile Legends: Bang Bang', format: 'squad', entryFee: 60, prizePool: 8000, maxPlayers: 40, registeredCount: 40, status: 'live', startsAt: new Date(Date.now() - 36e5).toISOString(), description: 'Full 5v5 draft pick. Group stage into single-elim playoffs. Live now!' },
  { id: 'tour_ff_past', title: 'Free Fire Friday Frenzy', game: 'Free Fire', format: 'solo', entryFee: 20, prizePool: 1500, maxPlayers: 50, registeredCount: 50, status: 'completed', startsAt: new Date(Date.now() - 2 * 864e5).toISOString(), description: 'Weekly Friday solo cup. Results are final.' },
  { id: 'tour_pubg_solo', title: 'PUBG Solo Sniper Cup', game: 'PUBG Mobile', format: 'solo', entryFee: 35, prizePool: 2500, maxPlayers: 80, registeredCount: 52, status: 'registration', startsAt: new Date(Date.now() + 4 * 864e5).toISOString(), description: 'Solo TPP. 5 matches on Miramar and Sanhok. Headshot bonuses earn extra points.' },
  { id: 'tour_wr_ranked', title: 'Wild Rift Ranked Clash', game: 'League of Legends: Wild Rift', format: 'squad', entryFee: 45, prizePool: 4000, maxPlayers: 32, registeredCount: 18, status: 'registration', startsAt: new Date(Date.now() + 6 * 864e5).toISOString(), description: '5v5 ranked clash. Baron calls, dragon fights, and big plays. Emerald+ only.' },
  { id: 'tour_coc_war', title: 'Clash of Clans War Cup', game: 'Clash of Clans', format: 'squad', entryFee: 30, prizePool: 1800, maxPlayers: 20, registeredCount: 12, status: 'upcoming', startsAt: new Date(Date.now() + 10 * 864e5).toISOString(), description: 'Clan war style — best base designs and attack strategies win. TH14+.' },
];

export const TOURNAMENT_STANDINGS: import('./types').TournamentStanding[] = [
  { rank: 1, ign: 'GhostSniper', game: 'PUBG Mobile', xp: 3450, country: 'KE', kills: 89, wins: 14, matches: 20 },
  { rank: 2, ign: 'BlazeQueen', game: 'Free Fire', xp: 3120, country: 'BR', kills: 76, wins: 12, matches: 20 },
  { rank: 3, ign: 'ShadowNinja', game: 'Mobile Legends: Bang Bang', xp: 2890, country: 'PH', kills: 64, wins: 11, matches: 18 },
  { rank: 4, ign: 'ProGamerKE', game: 'Call of Duty: Mobile', xp: 2670, country: 'KE', kills: 58, wins: 9, matches: 20 },
  { rank: 5, ign: 'WildRiftAce', game: 'League of Legends: Wild Rift', xp: 2450, country: 'IN', kills: 52, wins: 10, matches: 16 },
  { rank: 6, ign: 'FireFox', game: 'Free Fire', xp: 2180, country: 'NG', kills: 47, wins: 7, matches: 20 },
  { rank: 7, ign: 'AceStriker', game: 'EA SPORTS FC Mobile', xp: 1980, country: 'GH', kills: 0, wins: 15, matches: 20 },
  { rank: 8, ign: 'LegendKing', game: 'Clash of Clans', xp: 1720, country: 'ZA', kills: 0, wins: 12, matches: 18 },
  { rank: 9, ign: 'RobloxRanger', game: 'Roblox', xp: 1450, country: 'US', kills: 0, wins: 10, matches: 15 },
  { rank: 10, ign: 'BlockBuilder', game: 'Minecraft', xp: 1180, country: 'GB', kills: 0, wins: 8, matches: 15 },
  { rank: 11, ign: 'DarkLordKE', game: 'PUBG Mobile', xp: 980, country: 'KE', kills: 31, wins: 5, matches: 20 },
  { rank: 12, ign: 'NovaStrike', game: 'Call of Duty: Mobile', xp: 820, country: 'EG', kills: 28, wins: 4, matches: 18 },
];

export const RANK_BADGE_INFO: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  global_top100: { label: 'Global Top 100', icon: 'Globe', color: 'from-blue-500 to-indigo-600', desc: 'Ranked among the top 100 players worldwide' },
  country_top1: { label: 'Country #1', icon: 'Crown', color: 'from-amber-400 to-yellow-600', desc: 'The highest-ranked player in your country' },
  country_top3: { label: 'Country Top 3', icon: 'Medal', color: 'from-orange-400 to-red-500', desc: 'Top 3 in your country' },
  country_top10: { label: 'Country Top 10', icon: 'Award', color: 'from-emerald-400 to-teal-600', desc: 'Top 10 in your country' },
  rising_star: { label: 'Rising Star', icon: 'TrendingUp', color: 'from-cyan-400 to-blue-500', desc: 'Fastest XP growth this week' },
};

export const AD_REWARD_OPTIONS: { type: import('./types').AdRewardType; label: string; reward: number; desc: string; icon: string }[] = [
  { type: 'bonus_coins', label: 'Bonus Hub Coins', reward: 10, desc: 'Watch a short ad and earn 10 Hub Coins', icon: 'Coins' },
  { type: 'streak_protection', label: 'Streak Protection', reward: 0, desc: 'Protect your daily streak from breaking today', icon: 'ShieldCheck' },
  { type: 'xp_boost', label: 'XP Boost', reward: 50, desc: 'Watch an ad and instantly gain 50 bonus XP', icon: 'Zap' },
];
