import { useEffect, useRef, type RefObject } from "react";
import {
  createFormation,
  type FormationController,
  type FormationOptions,
  type FormationProfile,
  type FormationRoot,
} from "@dynt/formation";

export type UseFormationOptions<ProfileName extends string = FormationProfile> =
  Omit<FormationOptions<ProfileName>, "root"> & Readonly<{
    rootRef: RefObject<FormationRoot | null>;
  }>;

export function useFormation<ProfileName extends string = FormationProfile>({
  rootRef,
  selector,
  exclude,
  profile,
  profiles,
  observe,
  groups,
  tokens,
  viewportFlow,
}: UseFormationOptions<ProfileName>): RefObject<FormationController<ProfileName> | null> {
  const controllerRef = useRef<FormationController<ProfileName> | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const controller = createFormation({
      root,
      selector,
      exclude,
      profile,
      profiles,
      observe,
      groups,
      tokens,
      viewportFlow,
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [exclude, groups, observe, profile, profiles, rootRef, selector, tokens, viewportFlow]);

  return controllerRef;
}
