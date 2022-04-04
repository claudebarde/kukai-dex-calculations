import { beforeAll, describe, it, expect } from "vitest";
import DexterCalculations from "../index";
import fs from "fs";
import BigNumber from "bignumber.js";

let dexter: DexterCalculations;

beforeAll(() => {
  dexter = new DexterCalculations();
});

describe("dexter-calculations for xtzToToken", () => {
  it("xtzToTokenTokenOutput", () => {
    const json = JSON.parse(
      fs.readFileSync("tests/xtz_to_token.json").toString()
    );
    json.map((v: any) => {
      expect(
        dexter
          .xtzToTokenTokenOutput(v["xtz_in"], v["xtz_pool"], v["token_pool"])
          ?.toNumber()
      ).toEqual(v["token_out"]);
      expect(
        dexter.xtzToTokenPriceImpact(
          v["xtz_in"],
          v["xtz_pool"],
          v["token_pool"],
          0
        )
      ).toEqual(parseFloat(v["price_impact"]));
    });

    expect(
      dexter.xtzToTokenTokenOutput(1000000, 1000000000, 250000, 0, 0)
    ).toEqual(new BigNumber(248));

    // too small
    expect(dexter.xtzToTokenTokenOutput(5, 100000, 10, 0, 0)).toEqual(
      new BigNumber(0)
    );

    expect(dexter.xtzToTokenTokenOutput(5000, 100000, 10, 0, 0)).toEqual(
      new BigNumber(0)
    );

    expect(dexter.xtzToTokenTokenOutput(10000, 100000, 10, 0, 0)).toEqual(
      new BigNumber(0)
    );

    // now enough
    expect(dexter.xtzToTokenTokenOutput(500000, 100000, 10, 0, 0)).toEqual(
      new BigNumber(1)
    );
  });

  /*it("xtzToTokenXtzInput", () => {
    // based on tzBTC test data
    expect(
      dexter.xtzToTokenXtzInput(2000000, 38490742927, 44366268)
    ).toEqual(bigInt(1820804468));
  });

  it("xtzToTokenExchangeRate", () => {
    // based on tzBTC test data
    const exchangeRate = dexter.xtzToTokenExchangeRate(
      1000000,
      34204881343,
      39306268
    );
    expect(exchangeRate).toBeGreaterThan(0.001145 - 0.0005);
    expect(exchangeRate).toBeLessThan(0.001145 + 0.0005);
  });

  it("xtzToTokenExchangeRateForDisplay", () => {
    // based on tzBTC test data
    const exchangeRate = dexter.xtzToTokenExchangeRateForDisplay(
      1000000,
      34204881343,
      39306268
    );
    expect(exchangeRate).toBeGreaterThan(0.00001145 - 0.0005);
    expect(exchangeRate).toBeLessThan(0.00001145 + 0.0005);
  });

  it("xtzToTokenMarketRate", () => {
    expect(
      dexter.xtzToTokenMarketRate("144621788919", "961208019", "8")
    ).toBe(0.000066463568607795);
  });

  it("xtzToTokenPriceImpact", () => {
    // good
    const priceImpact0 = dexter.xtzToTokenPriceImpact(
      1000000,
      29757960047,
      351953939
    );
    expect(priceImpact0).toBe(0.0010338398421562767);

    // too small
    const priceImpact1 = dexter.xtzToTokenPriceImpact(
      5,
      100000,
      10
    );
    expect(priceImpact1).toBe(0);

    const priceImpact2 = dexter.xtzToTokenPriceImpact(
      20000,
      100000,
      10
    );
    expect(priceImpact2).toBe(0);

    const priceImpact3 = dexter.xtzToTokenPriceImpact(
      90000,
      100000,
      10
    );
    expect(priceImpact3).toBe(0);

    const priceImpact4 = dexter.xtzToTokenPriceImpact(
      200000,
      100000,
      10
    );
    expect(priceImpact4).toBe(0);

    // // based on tzBTC test data
    const priceImpact5 = dexter.xtzToTokenPriceImpact(
      1000000,
      34204881343,
      39306268
    );
    expect(priceImpact5).toBe(0.0017911036371857797);

    // // based on tzBTC test data
    const priceImpact6 = dexter.xtzToTokenPriceImpact(
      200000000,
      34204881343,
      39306268
    );
    expect(priceImpact6).toBe(0.006803905069661623);
  });

  it("xtzToTokenMinimumTokenOutput", () => {
    expect(
      dexter.xtzToTokenMinimumTokenOutput(10000, 0.05)
    ).toEqual(bigInt(9500));
    expect(
      dexter.xtzToTokenMinimumTokenOutput(10000, 0.01)
    ).toEqual(bigInt(9900));
    expect(
      dexter.xtzToTokenMinimumTokenOutput(330000, 0.005)
    ).toEqual(bigInt(328350));

    expect(dexter.xtzToTokenMinimumTokenOutput(1000, 0.01)).toEqual(
      bigInt(990)
    );
    expect(dexter.xtzToTokenMinimumTokenOutput(5000, 0.2)).toEqual(
      bigInt(4000)
    );
    expect(dexter.xtzToTokenMinimumTokenOutput(100, 0.055)).toEqual(
      bigInt(94)
    );

    expect(
      dexter.xtzToTokenMinimumTokenOutput(5846941182, 0.3142)
    ).toEqual(bigInt(4009832262));
  });

  it("totalLiquidityProviderFee", () => {
    expect(dexter.totalLiquidityProviderFee(1000000)).toEqual(
      bigInt(1000)
    );
    expect(dexter.totalLiquidityProviderFee(2000000)).toEqual(
      bigInt(2000)
    );
    expect(dexter.totalLiquidityProviderFee(1000000000)).toEqual(
      bigInt(1000000)
    );
    expect(dexter.totalLiquidityProviderFee(2500000000)).toEqual(
      bigInt(2500000)
    );
  });

  it("liquidityProviderFee", () => {
    expect(
      dexter.liquidityProviderFee(1000000, 200000000, 100000000)
    ).toEqual(bigInt(500));
    expect(
      dexter.liquidityProviderFee(2000000, 200000000, 10000000)
    ).toEqual(bigInt(100));
  });
});

describe("dexter-calculations for tokenToXtz", () => {
  it("tokenToXtzXtzOutput", () => {
    const json = JSON.parse(fs.readFileSync("test/token_to_xtz.json"));
    json.map(v => {
      expect(
        dexter.tokenToXtzXtzOutput(
          v["token_in"],
          v["xtz_pool"],
          v["token_pool"]
        )
      ).toEqual(bigInt(v["xtz_out"]));
      expect(
        dexter.tokenToXtzPriceImpact(
          v["token_in"],
          v["xtz_pool"],
          v["token_pool"]
        )
      ).toEqual(parseFloat(v["price_impact"]));
    });
    return expect(
      dexter.tokenToXtzXtzOutput(1000, 20000000, 1000)
    ).toEqual(bigInt(11233127));
  });

  it("tokenToXtzTokenInput", () => {
    // based on tzBTC test data
    expect(
      dexter.tokenToXtzTokenInput(12000000, 38490742927, 44366268)
    ).toEqual(bigInt(13849));
  });

  it("tokenToXtzExchangeRate", () => {
    // based on tzBTC test data
    const exchangeRate = dexter.tokenToXtzExchangeRate(
      100000000,
      38490742927,
      44366268
    );
    expect(exchangeRate).toBeGreaterThan(266.28693827 - 0.0005);
    expect(exchangeRate).toBeLessThan(266.28693827 + 0.0005);
  });

  it("tokenToXtzExchangeRateForDisplay", () => {
    // based on tzBTC test data
    const exchangeRate = dexter.tokenToXtzExchangeRateForDisplay(
      100000000,
      38490742927,
      44366268
    );
    expect(exchangeRate).toBeGreaterThan(26628.743327 - 0.0005);
    expect(exchangeRate).toBeLessThan(26628.743327 + 0.0005);
  });

  it("tokenToXtzMarketRate", () => {
    expect(
      dexter.tokenToXtzMarketRate("144621788919", "961208019")
    ).toBe(15045.836703428498);
  });

  it("tokenToXtzPriceImpact", () => {
    // // based on tzBTC test data
    const priceImpact = dexter.tokenToXtzPriceImpact(
      100000000,
      3849181242,
      44365061
    );
    expect(priceImpact).toBe(0.6929956900968133);

    // // based on tzBTC test data
    const priceImpact2 = dexter.tokenToXtzPriceImpact(
      40000000,
      3849181242,
      44365061
    );
    expect(priceImpact2).toBe(0.4746557948420604);
  });

  it("tokenToXtzMinimumTokenOutput", () => {
    expect(dexter.tokenToXtzMinimumXtzOutput(10000, 0.05)).toEqual(
      bigInt(9500)
    );
    expect(dexter.tokenToXtzMinimumXtzOutput(10000, 0.01)).toEqual(
      bigInt(9900)
    );
    expect(
      dexter.tokenToXtzMinimumXtzOutput(330000, 0.005)
    ).toEqual(bigInt(328350));
    expect(
      dexter.tokenToXtzMinimumXtzOutput(2739516881, 0.36)
    ).toEqual(bigInt(1753290803));
  });
});

describe("dexter-calculations for addLiquidity", () => {
  it("addLiquidityTokenIn", () => {
    expect(
      dexter.addLiquidityTokenIn(1000000, 1000000, 500000)
    ).toEqual(bigInt(142858));
    expect(
      dexter.addLiquidityTokenIn(1500000, 1000000, 500000)
    ).toEqual(bigInt(214286));
    expect(
      dexter.addLiquidityTokenIn(10000000, 6000000000, 100000000)
    ).toEqual(bigInt(166598));
  });

  it("addLiquidityXtzIn", () => {
    expect(
      dexter.addLiquidityXtzIn(1000000, 500000, 1000000)
    ).toEqual(bigInt(3000000));
    expect(
      dexter.addLiquidityXtzIn(1500000, 500000, 1000000)
    ).toEqual(bigInt(4500000));
    expect(
      dexter.addLiquidityXtzIn(10000000, 100000000, 6000000000)
    ).toEqual(bigInt(170833));

    expect(
      dexter.addLiquidityXtzIn(1000000, 1000000, 500000)
    ).toEqual(bigInt(7000000));
    expect(
      dexter.addLiquidityXtzIn(1500000, 1000000, 500000)
    ).toEqual(bigInt(10500000));
    expect(
      dexter.addLiquidityXtzIn(10000000, 6000000000, 100000000)
    ).toEqual(bigInt(600250000));

    expect(
      dexter.addLiquidityXtzIn(1000000, 9563874659, 19868860091)
    ).toEqual(bigInt(481475));
  });
});

describe("dexter-calculations for removeLiquidity", () => {
  it("removeLiquidityXtzOut", () => {
    expect(
      dexter.removeLiquidityXtzOut(5000000, 100000000, 5000000)
    ).toEqual(bigInt(375000));
    expect(
      dexter.removeLiquidityXtzOut(100000000, 100000000, 5000000)
    ).toEqual(bigInt(7500000));
    expect(
      dexter.removeLiquidityXtzOut(33333333, 100000000, 5000000)
    ).toEqual(bigInt(2499999));
    expect(
      dexter.removeLiquidityXtzOut(2600000, 100000000, 6600000)
    ).toEqual(bigInt(236600));
  });

  it("removeLiquidityTokenOut", () => {
    expect(
      dexter.removeLiquidityTokenOut(5000000, 100000000, 5000000)
    ).toEqual(bigInt(250000));
    expect(
      dexter.removeLiquidityTokenOut(100000000, 100000000, 5000000)
    ).toEqual(bigInt(5000000));
    expect(
      dexter.removeLiquidityTokenOut(33333333, 100000000, 5000000)
    ).toEqual(bigInt(1666666));
    expect(
      dexter.removeLiquidityTokenOut(2600000, 100000000, 70000000)
    ).toEqual(bigInt(1820000));
  });*/
});
