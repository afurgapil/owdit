import {
  transformContractSourceToUnified,
  transformRiskAnalysisToUnified,
  transformToUnifiedFormat,
  isVerifiedContract,
  isUnverifiedContract,
} from '../contractAnalysis';

describe('types/contractAnalysis transforms and guards', () => {
  const nowIsoMatcher = /\d{4}-\d{2}-\d{2}T/;

  test('transformContractSourceToUnified produces verified analysis', () => {
    const input = {
      verified: true,
      chainId: 1,
      address: '0xabc',
      contractName: 'MyContract',
      compilerVersion: '0.8.21',
      files: [{ path: 'A.sol', content: 'contract A {}' }],
      abi: [],
      sourceCode: 'pragma solidity ^0.8.21;'
    } as any; // use any to satisfy ContractSource shape for test

    const result = transformContractSourceToUnified(input);

    expect(result.verified).toBe(true);
    expect(result.analysisType).toBe('verified');
    expect(result.contractInfo).toEqual({
      name: 'MyContract',
      compilerVersion: '0.8.21',
      isContract: true,
      bytecodeLength: undefined,
    });
    expect(result.sourceCode?.files.length).toBe(1);
    expect(result.timestamp).toMatch(nowIsoMatcher);
    expect(isVerifiedContract(result)).toBe(true);
    expect(isUnverifiedContract(result)).toBe(false);
  });

  test('transformRiskAnalysisToUnified produces unverified analysis', () => {
    const input = {
      verified: false,
      chainId: 11155111,
      address: '0xdef',
      isContract: true,
      bytecodeLength: 12345,
      selectors: ['0x12345678'],
      opcodeCounters: { PUSH1: 10 },
      risk: { severity: 'high', risks: ['reentrancy'] },
      aiOutput: { score: 70, reason: 'ok' },
    } as any; // use any to satisfy RiskAnalysisResult shape for test

    const result = transformRiskAnalysisToUnified(input);

    expect(result.verified).toBe(false);
    expect(result.analysisType).toBe('unverified');
    expect(result.bytecodeAnalysis?.selectors).toEqual(['0x12345678']);
    expect(result.contractInfo).toEqual({
      name: undefined,
      compilerVersion: undefined,
      isContract: true,
      bytecodeLength: 12345,
    });
    expect(result.timestamp).toMatch(nowIsoMatcher);
    expect(isVerifiedContract(result)).toBe(false);
    expect(isUnverifiedContract(result)).toBe(true);
  });

  test('transformToUnifiedFormat dispatches based on verified flag', () => {
    const verifiedInput = { verified: true, chainId: 1, address: '0x1', files: [], abi: [], sourceCode: '', contractName: 'X', compilerVersion: 'v' } as any;
    const unverifiedInput = { verified: false, chainId: 1, address: '0x2', isContract: false, bytecodeLength: 0, selectors: [], opcodeCounters: {}, risk: { severity: 'low', risks: [] } } as any;

    const v = transformToUnifiedFormat(verifiedInput);
    const u = transformToUnifiedFormat(unverifiedInput);

    expect(v.analysisType).toBe('verified');
    expect(u.analysisType).toBe('unverified');
  });
});


