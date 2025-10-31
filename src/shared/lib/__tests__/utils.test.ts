import {
  cn,
  formatTimestamp,
  getRiskLevelColor,
  getRiskLevelText,
  shortenAddress,
  isValidEthereumAddress,
} from "../utils";

describe("Utils", () => {
  describe("cn", () => {
    it("should combine class names correctly", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should handle conditional classes", () => {
      expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    });

    it("should merge Tailwind classes correctly", () => {
      expect(cn("px-2", "px-4")).toBe("px-4");
    });

    it("should handle empty input", () => {
      expect(cn()).toBe("");
    });

    it("should handle arrays", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });

    it("should handle objects", () => {
      expect(cn({ foo: true, bar: false })).toBe("foo");
    });
  });

  describe("formatTimestamp", () => {
    it("should format timestamp correctly", () => {
      const timestamp = "2024-01-15T10:30:00.000Z";
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toContain("January");
      expect(formatted).toContain("15");
      expect(formatted).toContain("2024");
    });

    it("should handle different timezones", () => {
      const timestamp = "2024-12-25T00:00:00.000Z";
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toContain("December");
      expect(formatted).toContain("25");
      expect(formatted).toContain("2024");
    });

    it("should include time in formatted output", () => {
      const timestamp = "2024-01-15T14:30:00.000Z";
      const formatted = formatTimestamp(timestamp);
      // Time will vary based on locale, just check it's present
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe("getRiskLevelColor", () => {
    it("should return green for low risk (score >= 80)", () => {
      expect(getRiskLevelColor(80)).toBe("text-green-600 bg-green-100");
      expect(getRiskLevelColor(90)).toBe("text-green-600 bg-green-100");
      expect(getRiskLevelColor(100)).toBe("text-green-600 bg-green-100");
    });

    it("should return yellow for medium risk (60 <= score < 80)", () => {
      expect(getRiskLevelColor(60)).toBe("text-yellow-600 bg-yellow-100");
      expect(getRiskLevelColor(70)).toBe("text-yellow-600 bg-yellow-100");
      expect(getRiskLevelColor(79)).toBe("text-yellow-600 bg-yellow-100");
    });

    it("should return orange for high risk (40 <= score < 60)", () => {
      expect(getRiskLevelColor(40)).toBe("text-orange-600 bg-orange-100");
      expect(getRiskLevelColor(50)).toBe("text-orange-600 bg-orange-100");
      expect(getRiskLevelColor(59)).toBe("text-orange-600 bg-orange-100");
    });

    it("should return red for critical risk (score < 40)", () => {
      expect(getRiskLevelColor(0)).toBe("text-red-600 bg-red-100");
      expect(getRiskLevelColor(20)).toBe("text-red-600 bg-red-100");
      expect(getRiskLevelColor(39)).toBe("text-red-600 bg-red-100");
    });
  });

  describe("getRiskLevelText", () => {
    it('should return "Low Risk" for score >= 80', () => {
      expect(getRiskLevelText(80)).toBe("Low Risk");
      expect(getRiskLevelText(90)).toBe("Low Risk");
      expect(getRiskLevelText(100)).toBe("Low Risk");
    });

    it('should return "Medium Risk" for 60 <= score < 80', () => {
      expect(getRiskLevelText(60)).toBe("Medium Risk");
      expect(getRiskLevelText(70)).toBe("Medium Risk");
      expect(getRiskLevelText(79)).toBe("Medium Risk");
    });

    it('should return "High Risk" for 40 <= score < 60', () => {
      expect(getRiskLevelText(40)).toBe("High Risk");
      expect(getRiskLevelText(50)).toBe("High Risk");
      expect(getRiskLevelText(59)).toBe("High Risk");
    });

    it('should return "Critical Risk" for score < 40', () => {
      expect(getRiskLevelText(0)).toBe("Critical Risk");
      expect(getRiskLevelText(20)).toBe("Critical Risk");
      expect(getRiskLevelText(39)).toBe("Critical Risk");
    });
  });

  describe("shortenAddress", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";

    it("should shorten address with default chars (4)", () => {
      expect(shortenAddress(address)).toBe("0x1234...5678");
    });

    it("should shorten address with custom chars", () => {
      expect(shortenAddress(address, 6)).toBe("0x123456...345678");
    });

    it("should shorten address with 2 chars", () => {
      expect(shortenAddress(address, 2)).toBe("0x12...78");
    });

    it("should handle empty address", () => {
      expect(shortenAddress("")).toBe("");
    });

    it("should handle short addresses", () => {
      expect(shortenAddress("0x1234", 2)).toBe("0x12...34");
    });
  });

  describe("isValidEthereumAddress", () => {
    it("should validate correct Ethereum addresses", () => {
      expect(
        isValidEthereumAddress("0x1234567890abcdef1234567890abcdef12345678")
      ).toBe(true);
      expect(
        isValidEthereumAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF12")
      ).toBe(true);
      expect(
        isValidEthereumAddress("0x0000000000000000000000000000000000000000")
      ).toBe(true);
    });

    it("should reject addresses without 0x prefix", () => {
      expect(
        isValidEthereumAddress("1234567890abcdef1234567890abcdef12345678")
      ).toBe(false);
    });

    it("should reject addresses with wrong length", () => {
      expect(isValidEthereumAddress("0x1234")).toBe(false);
      expect(
        isValidEthereumAddress("0x1234567890abcdef1234567890abcdef123456789")
      ).toBe(false);
    });

    it("should reject addresses with invalid characters", () => {
      expect(
        isValidEthereumAddress("0x1234567890abcdef1234567890abcdef1234567g")
      ).toBe(false);
      expect(
        isValidEthereumAddress("0x1234567890abcdef1234567890abcdef1234567!")
      ).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidEthereumAddress("")).toBe(false);
    });

    it("should reject non-string input", () => {
      expect(isValidEthereumAddress(null as unknown as string)).toBe(false);
      expect(isValidEthereumAddress(undefined as unknown as string)).toBe(
        false
      );
    });
  });
});
