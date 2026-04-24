import { useSyncExternalStore } from 'react';
import {
  runtimeAssetLoadingController,
  type AssetLoadingProgress,
} from '../services/runtimeAssetLoading';

export const ensureRuntimeAssetLoadingStarted = () => {
  void runtimeAssetLoadingController.start();
};

export function useRuntimeAssetLoadingProgress(): AssetLoadingProgress {
  return useSyncExternalStore(
    runtimeAssetLoadingController.subscribe,
    runtimeAssetLoadingController.getSnapshot,
    runtimeAssetLoadingController.getSnapshot,
  );
}
