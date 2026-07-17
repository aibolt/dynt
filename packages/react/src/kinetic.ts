import { useEffect, useRef, type RefObject } from "react";
import {
  createKinetic,
  type KineticController,
  type KineticOptions,
  type KineticRoot,
} from "@dynt/kinetic";

export type UseKineticOptions = Omit<KineticOptions, "root"> & Readonly<{
  rootRef: RefObject<KineticRoot | null>;
}>;

export function useKinetic({
  rootRef,
  selector,
  exclude,
  observe,
  effects,
  limits,
  motion,
}: UseKineticOptions): RefObject<KineticController | null> {
  const controllerRef = useRef<KineticController | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const controller = createKinetic({
      root,
      selector,
      exclude,
      observe,
      effects,
      limits,
      motion,
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [effects, exclude, limits, motion, observe, rootRef, selector]);

  return controllerRef;
}
