"use client";

import { configureStore } from "@reduxjs/toolkit";
import { api } from "../state/api"; // ruta a tu api.ts

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer, // añade el reducer del api
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware), // añade el middleware del api
});

// Tipos opcionales para usar en todo tu proyecto
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
