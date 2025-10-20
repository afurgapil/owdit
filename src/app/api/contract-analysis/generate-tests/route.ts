import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateTestsOn0G } from "../../../../shared/lib/zeroG/generateTests";
import { genRequestId, logger } from "../../../../shared/lib/logger";

const testGenerationRequestSchema = z.object({
  contractCode: z.string().min(1, "Contract code is required"),
  contractName: z.string().min(1, "Contract name is required"),
  testFrameworks: z
    .array(z.enum(["hardhat", "foundry"]))
    .min(1, "At least one test framework must be selected"),
});

const testGenerationResponseSchema = z.object({
  success: z.boolean(),
  tests: z.object({
    hardhat: z
      .object({
        testFile: z.string(),
        setupFile: z.string(),
      })
      .optional(),
    foundry: z
      .object({
        testFile: z.string(),
      })
      .optional(),
  }),
  coverage: z.object({
    functionsCount: z.number(),
    testCasesCount: z.number(),
  }),
  error: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const requestId = genRequestId();
  logger.info(`[${requestId}] Test generation request received`);

  try {
    const body = await request.json();
    logger.info(`[${requestId}] Request body parsed successfully`);

    // Validate request body
    const validatedData = testGenerationRequestSchema.parse(body);
    logger.info(
      `[${requestId}] Request validation successful for contract: ${validatedData.contractName}`
    );

    // Check if 0G private key is configured
    if (!process.env.ZERO_G_PRIVATE_KEY) {
      logger.error(`[${requestId}] ZERO_G_PRIVATE_KEY not configured`);
      return NextResponse.json(
        {
          success: false,
          error: "Test generation service not configured",
        },
        { status: 500 }
      );
    }

    // Generate tests using 0G inference
    logger.info(
      `[${requestId}] Starting test generation for frameworks: ${validatedData.testFrameworks.join(
        ", "
      )}`
    );
    const testResult = await generateTestsOn0G({
      contractCode: validatedData.contractCode,
      contractName: validatedData.contractName,
      testFrameworks: validatedData.testFrameworks,
    });

    if (!testResult.success) {
      logger.error(
        `[${requestId}] Test generation failed: ${testResult.error}`
      );

      // Determine appropriate status code based on error type
      let statusCode = 500;
      if (
        testResult.error?.includes("0G AI services are currently unavailable")
      ) {
        statusCode = 503; // Service Unavailable
      } else if (testResult.error?.includes("timeout")) {
        statusCode = 504; // Gateway Timeout
      }

      return NextResponse.json(
        {
          success: false,
          error: testResult.error || "Test generation failed",
        },
        { status: statusCode }
      );
    }

    // Validate response structure
    const validatedResponse = testGenerationResponseSchema.parse({
      success: testResult.success,
      tests: testResult.tests,
      coverage: testResult.coverage,
    });

    logger.info(
      `[${requestId}] Test generation completed successfully. Functions: ${testResult.coverage.functionsCount}, Test cases: ${testResult.coverage.testCasesCount}`
    );

    return NextResponse.json(validatedResponse);
  } catch (error) {
    logger.error(`[${requestId}] Test generation error:`, { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
