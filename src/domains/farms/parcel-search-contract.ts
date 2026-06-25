import { z } from "zod";

const koreaLatitudeSchema = z.number().finite().min(33).max(39.5);
const koreaLongitudeSchema = z.number().finite().min(124).max(132);
const representativeAddressSchema = z.string().trim().min(1).max(200);
const pnuSchema = z.string().trim().regex(/^\d{19}$/, "PNU는 숫자 19자리여야 합니다.");
const bjdCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "법정동코드는 숫자 10자리여야 합니다.");
const landCodeSchema = z.enum(["01", "02", "03", "04", "06"]);
const areaSchema = z.number().finite().nonnegative().max(100_000_000);

const coordinateRequestFields = {
  lat: koreaLatitudeSchema,
  lng: koreaLongitudeSchema,
  representativeAddress: representativeAddressSchema,
};

const radiusRequestSchema = z
  .object({
    mode: z.literal("RADIUS"),
    ...coordinateRequestFields,
    radiusMeters: z.number().int().min(1).max(1000).default(50),
  })
  .strict();

const pointRequestSchema = z
  .object({
    mode: z.literal("POINT"),
    ...coordinateRequestFields,
  })
  .strict();

const pnuRequestSchema = z
  .object({
    mode: z.literal("PNU"),
    pnu: pnuSchema,
  })
  .strict();

const regionRequestSchema = z
  .object({
    mode: z.literal("REGION"),
    bjdCode: bjdCodeSchema,
    landCodes: z
      .array(landCodeSchema)
      .min(1)
      .max(5)
      .transform((values) => Array.from(new Set(values))),
    minAreaSquareMeter: areaSchema.optional(),
    maxAreaSquareMeter: areaSchema.optional(),
  })
  .strict();

export const farmParcelSearchRequestSchema = z
  .discriminatedUnion("mode", [
    radiusRequestSchema,
    pointRequestSchema,
    pnuRequestSchema,
    regionRequestSchema,
  ])
  .superRefine((request, context) => {
    if (request.mode !== "REGION") return;
    if (
      request.minAreaSquareMeter === undefined ||
      request.maxAreaSquareMeter === undefined ||
      request.minAreaSquareMeter <= request.maxAreaSquareMeter
    ) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxAreaSquareMeter"],
      message: "최대 면적은 최소 면적 이상이어야 합니다.",
    });
  });

export type FarmParcelSearchRequest = z.output<typeof farmParcelSearchRequestSchema>;
export type FarmParcelSearchRequestInput = z.input<typeof farmParcelSearchRequestSchema>;
