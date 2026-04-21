export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  Favourites: undefined;
  History: undefined;
  Forum: undefined;
  Profile: undefined;
};

export type MapStackParamList = {
  MapScreen: undefined;
  EateryDetail: { eateryId: string };
  ReportQueue: { eateryId: string; stallId?: string; eateryName: string; stallName?: string };
  AddEatery: undefined;
  NewForumPost: undefined;
  GoPro: undefined;
Settings: undefined;
  Auth: undefined;
  WriteReview: { eateryId: string; eateryName: string; existingRating?: number; existingBody?: string };
  Admin: undefined;
};
