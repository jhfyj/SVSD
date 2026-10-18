import type { Place, Route } from "./geo";

/*
  A scripted drive for the prototype: Santa Monica to downtown LA on the I-10, about 16 miles.
  With ?sim and no trip set up, the radio drives this on its own, so the map moves on camera
  without location or a Destination (the dial kit's Tracking the road and Planting your answer).
  Path and turns are from OSRM (OpenStreetMap), saved here so it never needs the network.
*/

export const DEMO_DESTINATION: Place = { id: "demo-dtla", name: "Downtown LA", detail: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 };

export const DEMO_ROUTE: Route = {
  duration: 1315,
  distance: 25292,
  steps: [
    { maneuver: "TURN_RIGHT", instruction: "Head out", distance: 26 },
    { maneuver: "TURN_RIGHT", instruction: "Turn right", distance: 23 },
    { maneuver: "TURN_LEFT", instruction: "Turn left onto Lincoln Boulevard", distance: 731 },
    { maneuver: "TURN_LEFT", instruction: "Turn left onto Olympic Boulevard", distance: 112 },
    { instruction: "Take the ramp", distance: 412 },
    { maneuver: "MERGE", instruction: "Merge onto Santa Monica Freeway", distance: 15850 },
    { maneuver: "RAMP_RIGHT", instruction: "Take the exit", distance: 4350 },
    { maneuver: "RAMP_RIGHT", instruction: "Take the exit", distance: 396 },
    { instruction: "Continue on West 18th Street", distance: 443 },
    { maneuver: "TURN_LEFT", instruction: "Turn left onto South Main Street", distance: 2930 },
    { maneuver: "TURN_LEFT", instruction: "Turn left onto West 1st Street", distance: 20 },
    { maneuver: "ARRIVE", instruction: "Arrive", distance: 0 },
  ],
  // prettier-ignore
  points: [
    { lat: 34.01956, lng: -118.49113 }, { lat: 34.0194, lng: -118.49093 }, { lat: 34.01926, lng: -118.49111 }, { lat: 34.01583, lng: -118.48708 },
    { lat: 34.01517, lng: -118.48642 }, { lat: 34.0145, lng: -118.48565 }, { lat: 34.0151, lng: -118.48467 }, { lat: 34.01586, lng: -118.48362 },
    { lat: 34.01742, lng: -118.48174 }, { lat: 34.0177, lng: -118.4815 }, { lat: 34.02176, lng: -118.47657 }, { lat: 34.02217, lng: -118.47601 },
    { lat: 34.02264, lng: -118.4752 }, { lat: 34.02312, lng: -118.47406 }, { lat: 34.0233, lng: -118.47347 }, { lat: 34.02572, lng: -118.46455 },
    { lat: 34.02651, lng: -118.46145 }, { lat: 34.02757, lng: -118.45632 }, { lat: 34.02765, lng: -118.45575 }, { lat: 34.02769, lng: -118.45472 },
    { lat: 34.02758, lng: -118.45241 }, { lat: 34.02768, lng: -118.45124 }, { lat: 34.02788, lng: -118.45031 }, { lat: 34.02959, lng: -118.44382 },
    { lat: 34.03006, lng: -118.4415 }, { lat: 34.03145, lng: -118.43175 }, { lat: 34.03162, lng: -118.43005 }, { lat: 34.03165, lng: -118.42914 },
    { lat: 34.03172, lng: -118.4163 }, { lat: 34.03169, lng: -118.41525 }, { lat: 34.03162, lng: -118.41459 }, { lat: 34.03147, lng: -118.4137 },
    { lat: 34.03122, lng: -118.41285 }, { lat: 34.03033, lng: -118.41024 }, { lat: 34.03011, lng: -118.40918 }, { lat: 34.02943, lng: -118.40203 },
    { lat: 34.02903, lng: -118.39712 }, { lat: 34.029, lng: -118.39613 }, { lat: 34.02908, lng: -118.39543 }, { lat: 34.0292, lng: -118.39464 },
    { lat: 34.0294, lng: -118.39383 }, { lat: 34.02971, lng: -118.3929 }, { lat: 34.02997, lng: -118.39231 }, { lat: 34.03025, lng: -118.39178 },
    { lat: 34.03394, lng: -118.38554 }, { lat: 34.03622, lng: -118.3816 }, { lat: 34.03649, lng: -118.38095 }, { lat: 34.03669, lng: -118.38026 },
    { lat: 34.03682, lng: -118.37955 }, { lat: 34.0369, lng: -118.37875 }, { lat: 34.0369, lng: -118.37804 }, { lat: 34.03682, lng: -118.37733 },
    { lat: 34.03406, lng: -118.36437 }, { lat: 34.03377, lng: -118.36201 }, { lat: 34.03371, lng: -118.36037 }, { lat: 34.03523, lng: -118.3278 },
    { lat: 34.03538, lng: -118.32605 }, { lat: 34.03662, lng: -118.31754 }, { lat: 34.0366, lng: -118.31743 }, { lat: 34.03679, lng: -118.3144 },
    { lat: 34.03688, lng: -118.31182 }, { lat: 34.03683, lng: -118.3096 }, { lat: 34.03688, lng: -118.3073 }, { lat: 34.03684, lng: -118.30423 },
    { lat: 34.03676, lng: -118.30287 }, { lat: 34.03679, lng: -118.29998 }, { lat: 34.03669, lng: -118.2962 }, { lat: 34.0367, lng: -118.29188 },
    { lat: 34.03664, lng: -118.28588 }, { lat: 34.03695, lng: -118.28286 }, { lat: 34.03709, lng: -118.28218 }, { lat: 34.03758, lng: -118.28033 },
    { lat: 34.03767, lng: -118.27967 }, { lat: 34.03782, lng: -118.27802 }, { lat: 34.03789, lng: -118.27631 }, { lat: 34.03785, lng: -118.27428 },
    { lat: 34.03777, lng: -118.27353 }, { lat: 34.03764, lng: -118.27294 }, { lat: 34.03747, lng: -118.27242 }, { lat: 34.03717, lng: -118.27177 },
    { lat: 34.03668, lng: -118.27098 }, { lat: 34.03513, lng: -118.269 }, { lat: 34.03437, lng: -118.26772 }, { lat: 34.03219, lng: -118.26371 },
    { lat: 34.04001, lng: -118.25738 }, { lat: 34.044, lng: -118.2513 }, { lat: 34.04527, lng: -118.24993 }, { lat: 34.04627, lng: -118.24894 },
    { lat: 34.04895, lng: -118.24643 }, { lat: 34.05222, lng: -118.2434 }, { lat: 34.05233, lng: -118.24356 },
  ],
};
