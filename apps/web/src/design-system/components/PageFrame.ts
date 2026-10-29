/**
 * Set by a frame that already shows the page title (the Settings frame).
 * PageHero reads it and leaves the title to the frame, so a page never
 * shows two headers.
 */

import { createContext, useContext } from 'react';

export const PageFrameContext = createContext(false);

export const useInPageFrame = () => useContext(PageFrameContext);
