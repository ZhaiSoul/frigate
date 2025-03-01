import Heading from "../ui/heading";
import { Separator } from "../ui/separator";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useCallback, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import PolygonEditControls from "./PolygonEditControls";
import { FaCheckCircle } from "react-icons/fa";
import { Polygon } from "@/types/canvas";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  flattenPoints,
  interpolatePoints,
  parseCoordinates,
} from "@/utils/canvasUtil";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "../ui/sonner";
import ActivityIndicator from "../indicators/activity-indicator";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { t } from "i18next";
import { Trans } from "react-i18next";

type MotionMaskEditPaneProps = {
  polygons?: Polygon[];
  setPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  activePolygonIndex?: number;
  scaledWidth?: number;
  scaledHeight?: number;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onSave?: () => void;
  onCancel?: () => void;
  snapPoints: boolean;
  setSnapPoints: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function MotionMaskEditPane({
  polygons,
  setPolygons,
  activePolygonIndex,
  scaledWidth,
  scaledHeight,
  isLoading,
  setIsLoading,
  onSave,
  onCancel,
  snapPoints,
  setSnapPoints,
}: MotionMaskEditPaneProps) {
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const polygon = useMemo(() => {
    if (polygons && activePolygonIndex !== undefined) {
      return polygons[activePolygonIndex];
    } else {
      return null;
    }
  }, [polygons, activePolygonIndex]);

  const cameraConfig = useMemo(() => {
    if (polygon?.camera && config) {
      return config.cameras[polygon.camera];
    }
  }, [polygon, config]);

  const defaultName = useMemo(() => {
    if (!polygons) {
      return;
    }

    const count = polygons.filter((poly) => poly.type == "motion_mask").length;

    return `Motion Mask ${count + 1}`;
  }, [polygons]);

  const polygonArea = useMemo(() => {
    if (polygon && polygon.isFinished && scaledWidth && scaledHeight) {
      const points = interpolatePoints(
        polygon.points,
        scaledWidth,
        scaledHeight,
        1,
        1,
      );

      const n = points.length;
      let area = 0;

      for (let i = 0; i < n; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % n];
        area += x1 * y2 - y1 * x2;
      }

      return Math.abs(area) / 2;
    }
  }, [polygon, scaledWidth, scaledHeight]);

  const formSchema = z
    .object({
      polygon: z.object({ name: z.string(), isFinished: z.boolean() }),
    })
    .refine(() => polygon?.isFinished === true, {
      message: "The polygon drawing must be finished before saving.",
      path: ["polygon.isFinished"],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      polygon: { isFinished: polygon?.isFinished ?? false, name: defaultName },
    },
  });

  const saveToConfig = useCallback(async () => {
    if (!scaledWidth || !scaledHeight || !polygon || !cameraConfig) {
      return;
    }

    const coordinates = flattenPoints(
      interpolatePoints(polygon.points, scaledWidth, scaledHeight, 1, 1),
    ).join(",");

    let index = Array.isArray(cameraConfig.motion.mask)
      ? cameraConfig.motion.mask.length
      : cameraConfig.motion.mask
        ? 1
        : 0;

    const editingMask = polygon.name.length > 0;

    // editing existing mask, not creating a new one
    if (editingMask) {
      index = polygon.typeIndex;
    }

    const filteredMask = (
      Array.isArray(cameraConfig.motion.mask)
        ? cameraConfig.motion.mask
        : [cameraConfig.motion.mask]
    ).filter((_, currentIndex) => currentIndex !== index);

    filteredMask.splice(index, 0, coordinates);

    const queryString = filteredMask
      .map((pointsArray) => {
        const coordinates = flattenPoints(parseCoordinates(pointsArray)).join(
          ",",
        );
        return `cameras.${polygon?.camera}.motion.mask=${coordinates}&`;
      })
      .join("");

    axios
      .put(`config/set?${queryString}`, {
        requires_restart: 0,
      })
      .then((res) => {
        if (res.status === 200) {
          toast.success(
            `${polygon.name || "Motion Mask"} has been saved. Restart Frigate to apply changes.`,
            {
              position: "top-center",
            },
          );
          updateConfig();
        } else {
          toast.error(`Failed to save config changes: ${res.statusText}`, {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        toast.error(
          `Failed to save config changes: ${error.response.data.message}`,
          { position: "top-center" },
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    updateConfig,
    polygon,
    scaledWidth,
    scaledHeight,
    setIsLoading,
    cameraConfig,
  ]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (activePolygonIndex === undefined || !values || !polygons) {
      return;
    }
    setIsLoading(true);

    saveToConfig();
    if (onSave) {
      onSave();
    }
  }

  useEffect(() => {
    document.title = t(
      "ui.settingView.masksAndZonesSettings.motionMasks.documentTitle",
    );
  }, []);

  if (!polygon) {
    return;
  }

  return (
    <>
      <Toaster position="top-center" closeButton={true} />
      <Heading as="h3" className="my-2">
        {polygon.name.length
          ? t("ui.settingView.masksAndZonesSettings.motionMasks.edit")
          : t("ui.settingView.masksAndZonesSettings.motionMasks.add")}
      </Heading>
      <div className="my-3 space-y-3 text-sm text-muted-foreground">
        <p>
          <Trans>
            ui.settingView.masksAndZonesSettings.motionMasks.context
          </Trans>
        </p>

        <div className="flex items-center text-primary">
          <Link
            to="https://docs.frigate.video/configuration/masks/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline"
          >
            <Trans>
              ui.settingView.masksAndZonesSettings.motionMasks.context.documentation
            </Trans>{" "}
            <LuExternalLink className="ml-2 inline-flex size-3" />
          </Link>
        </div>
      </div>
      <Separator className="my-3 bg-secondary" />
      {polygons && activePolygonIndex !== undefined && (
        <div className="my-2 flex w-full flex-row justify-between text-sm">
          <div className="my-1 inline-flex">
            {t("ui.settingView.masksAndZonesSettings.motionMasks.point", {
              count: polygons[activePolygonIndex].points.length,
            })}
            {polygons[activePolygonIndex].isFinished && (
              <FaCheckCircle className="ml-2 size-5" />
            )}
          </div>
          <PolygonEditControls
            polygons={polygons}
            setPolygons={setPolygons}
            activePolygonIndex={activePolygonIndex}
            snapPoints={snapPoints}
            setSnapPoints={setSnapPoints}
          />
        </div>
      )}
      <div className="mb-3 text-sm text-muted-foreground">
        <Trans>
          ui.settingView.masksAndZonesSettings.motionMasks.clickDrawPolygon
        </Trans>
      </div>

      <Separator className="my-3 bg-secondary" />

      {polygonArea && polygonArea >= 0.35 && (
        <>
          <div className="mb-3 text-sm text-danger">
            {t(
              "ui.settingView.masksAndZonesSettings.motionMasks.polygonAreaTooLarge",
              {
                polygonArea: Math.round(polygonArea * 100),
              },
            )}
          </div>
          <div className="mb-3 text-sm text-primary">
            <Trans>
              ui.settingView.masksAndZonesSettings.motionMasks.polygonAreaTooLarge.tips
            </Trans>
            <Link
              to="https://github.com/blakeblackshear/frigate/discussions/13040"
              target="_blank"
              rel="noopener noreferrer"
              className="my-3 block"
            >
              <Trans>
                ui.settingView.masksAndZonesSettings.motionMasks.polygonAreaTooLarge.documentation
              </Trans>{" "}
              <LuExternalLink className="ml-2 inline-flex size-3" />
            </Link>
          </div>
        </>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col space-y-6"
        >
          <FormField
            control={form.control}
            name="polygon.name"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="polygon.isFinished"
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                aria-label="Cancel"
                onClick={onCancel}
              >
                <Trans>ui.cancel</Trans>
              </Button>
              <Button
                variant="select"
                aria-label="Save"
                disabled={isLoading}
                className="flex flex-1"
                type="submit"
              >
                {isLoading ? (
                  <div className="flex flex-row items-center gap-2">
                    <ActivityIndicator />
                    <span>
                      <Trans>ui.saving</Trans>
                    </span>
                  </div>
                ) : (
                  <Trans>ui.save</Trans>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}
