import { createSlice } from "@reduxjs/toolkit";

const locationSlice = createSlice({
  name: "location",
  initialState: {
    locationDetails: [
      {
        pincode: 560103,
        area: "Embassy Tech Village",
        lat: 12.92888450548889,
        lng: 77.69245843455866,
        district: "Bengaluru",
        state: "Karnataka",
      },
    ],
  },
  reducers: {
    updateLocation: (state, action) => {
      state.locationDetails = action.payload;
    },
  },
});

export const { updateLocation } = locationSlice.actions;
export default locationSlice.reducer;
