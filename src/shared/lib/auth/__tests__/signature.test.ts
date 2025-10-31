import {
  createNonce,
  consumeNonce,
  buildSignMessage,
  verifySignature,
} from "../signature";
import { ethers } from "ethers";

describe("Signature and Authentication", () => {
  const testAddress = "0x1234567890123456789012345678901234567890";
  const testAddress2 = "0xabcdef1234567890abcdef1234567890abcdef12";

  // Create a test wallet for signature testing
  const testPrivateKey = "0x" + "0".repeat(63) + "1";
  const testWallet = new ethers.Wallet(testPrivateKey);

  beforeEach(() => {
    // Clear the internal nonce store between tests
    // Note: Since nonces is module-level Map, we can't directly clear it
    // But we can use different addresses to avoid conflicts
  });

  describe("createNonce", () => {
    it("should create a nonce for an address", () => {
      const nonce = createNonce(testAddress);
      expect(nonce).toBeTruthy();
      expect(typeof nonce).toBe("string");
      expect(nonce.length).toBeGreaterThan(0);
    });

    it("should create unique nonces for same address", () => {
      const nonce1 = createNonce(testAddress);
      // Wait a tiny bit to ensure different timestamp
      const nonce2 = createNonce(testAddress);
      expect(nonce1).not.toBe(nonce2);
    });

    it("should create different nonces for different addresses", () => {
      const nonce1 = createNonce(testAddress);
      const nonce2 = createNonce(testAddress2);
      expect(nonce1).not.toBe(nonce2);
    });

    it("should handle lowercase addresses", () => {
      const nonce = createNonce(testAddress.toLowerCase());
      expect(nonce).toBeTruthy();
    });

    it("should handle mixed case addresses", () => {
      const nonce = createNonce(testAddress.toUpperCase());
      expect(nonce).toBeTruthy();
    });
  });

  describe("consumeNonce", () => {
    it("should consume a valid nonce", () => {
      const address = "0x1111111111111111111111111111111111111111";
      const nonce = createNonce(address);
      const consumed = consumeNonce(address, nonce);
      expect(consumed).toBe(true);
    });

    it("should not consume the same nonce twice", () => {
      const address = "0x2222222222222222222222222222222222222222";
      const nonce = createNonce(address);

      const firstConsume = consumeNonce(address, nonce);
      expect(firstConsume).toBe(true);

      const secondConsume = consumeNonce(address, nonce);
      expect(secondConsume).toBe(false);
    });

    it("should not consume nonce with wrong address", () => {
      const address1 = "0x3333333333333333333333333333333333333333";
      const address2 = "0x4444444444444444444444444444444444444444";
      const nonce = createNonce(address1);

      const consumed = consumeNonce(address2, nonce);
      expect(consumed).toBe(false);
    });

    it("should not consume nonce with wrong nonce value", () => {
      const address = "0x5555555555555555555555555555555555555555";
      createNonce(address);

      const consumed = consumeNonce(address, "wrong-nonce");
      expect(consumed).toBe(false);
    });

    it("should not consume non-existent nonce", () => {
      const address = "0x6666666666666666666666666666666666666666";
      const consumed = consumeNonce(address, "non-existent");
      expect(consumed).toBe(false);
    });

    it("should handle case-insensitive address matching", () => {
      const address = "0x7777777777777777777777777777777777777777";
      const nonce = createNonce(address.toUpperCase());

      const consumed = consumeNonce(address.toLowerCase(), nonce);
      expect(consumed).toBe(true);
    });

    it("should reject expired nonce", async () => {
      // This test would require mocking time or waiting
      // For now, we'll just verify the structure
      const address = "0x8888888888888888888888888888888888888888";
      const nonce = createNonce(address);

      // Mock Date.now to simulate expiration
      const originalNow = Date.now;
      const fiveMinutesMs = 5 * 60 * 1000;

      // Fast-forward time by 6 minutes (exceeds TTL)
      Date.now = jest.fn(() => originalNow() + fiveMinutesMs + 60000);

      const consumed = consumeNonce(address, nonce);
      expect(consumed).toBe(false);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe("buildSignMessage", () => {
    it("should build a properly formatted message", () => {
      const params = {
        action: "comment",
        address: testAddress,
        ref: "0xcontract123",
        timestamp: 1234567890,
        nonce: "test-nonce-123",
      };

      const message = buildSignMessage(params);

      expect(message).toContain("Owdit Sign:");
      expect(message).toContain("action:comment");
      expect(message).toContain(`addr:${testAddress.toLowerCase()}`);
      expect(message).toContain("ref:0xcontract123");
      expect(message).toContain("ts:1234567890");
      expect(message).toContain("nonce:test-nonce-123");
    });

    it("should normalize address to lowercase", () => {
      const params = {
        action: "vote",
        address: testAddress.toUpperCase(),
        ref: "comment-id-456",
        timestamp: 1234567890,
        nonce: "nonce-456",
      };

      const message = buildSignMessage(params);
      expect(message).toContain(`addr:${testAddress.toLowerCase()}`);
      expect(message).not.toContain(testAddress.toUpperCase());
    });

    it("should include all fields in correct order", () => {
      const params = {
        action: "upvote",
        address: testAddress,
        ref: "ref-789",
        timestamp: 9876543210,
        nonce: "nonce-789",
      };

      const message = buildSignMessage(params);
      const lines = message.split("\n");

      expect(lines[0]).toBe("Owdit Sign:");
      expect(lines[1]).toBe("action:upvote");
      expect(lines[2]).toContain("addr:");
      expect(lines[3]).toBe("ref:ref-789");
      expect(lines[4]).toBe("ts:9876543210");
      expect(lines[5]).toBe("nonce:nonce-789");
    });

    it("should handle different action types", () => {
      const actions = ["comment", "vote", "upvote", "downvote", "delete"];

      actions.forEach((action) => {
        const message = buildSignMessage({
          action,
          address: testAddress,
          ref: "ref",
          timestamp: Date.now(),
          nonce: "nonce",
        });

        expect(message).toContain(`action:${action}`);
      });
    });
  });

  describe("verifySignature", () => {
    it("should verify a valid signature", async () => {
      const message = "Test message for signing";
      const signature = await testWallet.signMessage(message);

      const isValid = verifySignature(message, signature, testWallet.address);

      expect(isValid).toBe(true);
    });

    it("should reject signature from different address", async () => {
      const message = "Another test message";
      const signature = await testWallet.signMessage(message);
      const wrongAddress = "0x0000000000000000000000000000000000000000";

      const isValid = verifySignature(message, signature, wrongAddress);
      expect(isValid).toBe(false);
    });

    it("should reject invalid signature format", () => {
      const message = "Test message";
      const invalidSignature = "0xinvalid";

      const isValid = verifySignature(
        message,
        invalidSignature,
        testWallet.address
      );

      expect(isValid).toBe(false);
    });

    it("should reject signature for different message", async () => {
      const message1 = "Original message";
      const message2 = "Different message";
      const signature = await testWallet.signMessage(message1);

      const isValid = verifySignature(message2, signature, testWallet.address);

      expect(isValid).toBe(false);
    });

    it("should handle case-insensitive address comparison", async () => {
      const message = "Case test message";
      const signature = await testWallet.signMessage(message);

      const isValidLower = verifySignature(
        message,
        signature,
        testWallet.address.toLowerCase()
      );

      const isValidUpper = verifySignature(
        message,
        signature,
        testWallet.address.toUpperCase()
      );

      expect(isValidLower).toBe(true);
      expect(isValidUpper).toBe(true);
    });

    it("should handle signature with 0x prefix", async () => {
      const message = "Prefix test";
      const signature = await testWallet.signMessage(message);

      // Ensure signature has 0x prefix
      const prefixedSignature = signature.startsWith("0x")
        ? signature
        : `0x${signature}`;

      const isValid = verifySignature(
        message,
        prefixedSignature,
        testWallet.address
      );

      expect(isValid).toBe(true);
    });

    it("should verify signature for complex message", async () => {
      const params = {
        action: "comment",
        address: testWallet.address,
        ref: "0xcontract123",
        timestamp: Date.now(),
        nonce: createNonce(testWallet.address),
      };

      const message = buildSignMessage(params);
      const signature = await testWallet.signMessage(message);

      const isValid = verifySignature(message, signature, testWallet.address);

      expect(isValid).toBe(true);
    });
  });

  describe("Integration: Full Authentication Flow", () => {
    it("should complete full authentication flow", async () => {
      const address = testWallet.address;

      // 1. Create nonce
      const nonce = createNonce(address);
      expect(nonce).toBeTruthy();

      // 2. Build message
      const params = {
        action: "comment",
        address,
        ref: "0xcontract",
        timestamp: Date.now(),
        nonce,
      };
      const message = buildSignMessage(params);

      // 3. Sign message
      const signature = await testWallet.signMessage(message);

      // 4. Verify signature
      const isValid = verifySignature(message, signature, address);
      expect(isValid).toBe(true);

      // 5. Consume nonce
      const consumed = consumeNonce(address, nonce);
      expect(consumed).toBe(true);

      // 6. Try to consume again (should fail)
      const consumedAgain = consumeNonce(address, nonce);
      expect(consumedAgain).toBe(false);
    });

    it("should prevent replay attacks with used nonce", async () => {
      const address = testWallet.address;
      const nonce = createNonce(address);

      const params = {
        action: "vote",
        address,
        ref: "comment-id",
        timestamp: Date.now(),
        nonce,
      };
      const message = buildSignMessage(params);
      const signature = await testWallet.signMessage(message);

      // First verification and consumption
      expect(verifySignature(message, signature, address)).toBe(true);
      expect(consumeNonce(address, nonce)).toBe(true);

      // Second attempt with same nonce (should fail)
      expect(verifySignature(message, signature, address)).toBe(true); // Signature still valid
      expect(consumeNonce(address, nonce)).toBe(false); // But nonce already used
    });

    it("should handle multiple nonces with different addresses", async () => {
      // Use different addresses since nonces are stored per address
      const address1 = "0xa111111111111111111111111111111111111111";
      const address2 = "0xa222222222222222222222222222222222222222";
      const address3 = "0xa333333333333333333333333333333333333333";

      // Create nonces for different addresses
      const nonce1 = createNonce(address1);
      const nonce2 = createNonce(address2);
      const nonce3 = createNonce(address3);

      // All should be different
      expect(nonce1).not.toBe(nonce2);
      expect(nonce2).not.toBe(nonce3);
      expect(nonce1).not.toBe(nonce3);

      // All should be consumable independently
      expect(consumeNonce(address1, nonce1)).toBe(true);
      expect(consumeNonce(address2, nonce2)).toBe(true);
      expect(consumeNonce(address3, nonce3)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle empty message in verifySignature", () => {
      const isValid = verifySignature("", "0xsig", testAddress);
      expect(isValid).toBe(false);
    });

    it("should handle empty signature in verifySignature", () => {
      const isValid = verifySignature("message", "", testAddress);
      expect(isValid).toBe(false);
    });

    it("should handle malformed signature gracefully", () => {
      const message = "test";
      const malformedSignatures = [
        "not-a-signature",
        "0x",
        "0x123",
        "random-string",
        "{}",
        "null",
      ];

      malformedSignatures.forEach((sig) => {
        const isValid = verifySignature(message, sig, testAddress);
        expect(isValid).toBe(false);
      });
    });
  });
});
