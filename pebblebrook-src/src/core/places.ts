/** Place ids every module agrees on. The world generator must create all of them. */
export const PLACES = {
  // homes
  home_ada: 'home_ada', home_bram: 'home_bram', home_cerys: 'home_cerys', home_dov: 'home_dov', home_elin: 'home_elin',
  home_finn: 'home_finn', home_greta: 'home_greta', home_hal: 'home_hal', home_ines: 'home_ines', home_jory: 'home_jory',
  home_player: 'home_player',
  // workplaces (some double as homes' workplaces)
  farm: 'farm', barn: 'barn', smithy: 'smithy', bakery: 'bakery', dock: 'dock', clinic: 'clinic', tavern: 'tavern',
  mine: 'mine', store: 'store', library: 'library', carpenter: 'carpenter',
  // public
  square: 'square', well: 'well', board: 'board', chapel: 'chapel', festival_grounds: 'festival_grounds',
  forest: 'forest', lake: 'lake', river: 'river', orchard: 'orchard', graveyard: 'graveyard', meadow: 'meadow',
  hill: 'hill', bridge_east: 'bridge_east', bridge_west: 'bridge_west', player_farm: 'player_farm',
} as const;

export type KnownPlace = keyof typeof PLACES;
export const ALL_PLACE_IDS: string[] = Object.values(PLACES);
