import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest's globals don't trigger @testing-library/react's automatic cleanup,
// so each test's mounted component would leak into the next one ("Found
// multiple elements with the text …"). Unmount everything after each test.
afterEach(cleanup);
