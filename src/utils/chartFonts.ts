import chartTitleFontUrl from '@/assets/fonts/ZiHunDunHuangJingYunKai(ShangYongXuShouQuan)-2.ttf?url';

const chartTitleFontAlias = 'ChartTitleFont';
const chartTitleFontInternalName = '\u5b57\u9b42\u6566\u714c\u7ecf\u97f5\u6977(\u5546\u7528\u9700\u6388\u6743)';
const chartTitleFontSampleText =
    '\u8bd7\u4eba\u7c4d\u8d2f\u5206\u5e03\u56fe\u5173\u4e2d\u5730\u533a\u6c5f\u5357\u5317\u90e8\u8bd7\u4eba\u4eab\u5e74\u6570\u636e\u5206\u5e03\u56fe';

export const CHART_TITLE_FONT_FAMILY = `"${chartTitleFontAlias}", "${chartTitleFontInternalName}", "STKaiti", "KaiTi", serif`;

let chartFontReadyPromise: Promise<void> | null = null;
let chartTitleFontFaceLoaded = false;

const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
    });

const loadAndRegisterFontFace = async (family: string) => {
    if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') {
        return false;
    }

    try {
        const face = new FontFace(family, `url(${chartTitleFontUrl})`, {
            style: 'normal',
            weight: '400',
        });
        const loadedFace = await face.load();
        document.fonts.add(loadedFace);
        return true;
    } catch {
        return false;
    }
};

const waitForFontFamily = async (family: string, text: string, timeoutMs = 4500) => {
    if (typeof document === 'undefined' || !document.fonts) {
        return false;
    }

    const fontSet = document.fonts;
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        try {
            const loadedFonts = await fontSet.load(`400 16px "${family}"`, text);
            if (loadedFonts.length > 0) {
                return true;
            }
        } catch {
            // Keep trying until timeout.
        }
        await sleep(80);
    }
    return false;
};

const loadChartTitleFontFace = async () => {
    if (chartTitleFontFaceLoaded) {
        return;
    }

    const [aliasLoaded, internalLoaded] = await Promise.all([
        loadAndRegisterFontFace(chartTitleFontAlias),
        loadAndRegisterFontFace(chartTitleFontInternalName),
    ]);

    chartTitleFontFaceLoaded = aliasLoaded || internalLoaded;
};

export const waitForChartFonts = async () => {
    if (typeof document === 'undefined' || !document.fonts) {
        return;
    }

    if (!chartFontReadyPromise) {
        chartFontReadyPromise = (async () => {
            await loadChartTitleFontFace();

            const fontSet = document.fonts;
            await Promise.allSettled([
                fontSet.load('16px "TitleFont"'),
                fontSet.load('16px "ContentFont"'),
                fontSet.ready,
            ]);

            const [aliasReady, internalReady] = await Promise.all([
                waitForFontFamily(chartTitleFontAlias, chartTitleFontSampleText),
                waitForFontFamily(chartTitleFontInternalName, chartTitleFontSampleText),
            ]);

            if (!aliasReady && !internalReady) {
                console.warn('[chartFonts] ZiHunDunHuangJingYunKai load not confirmed, ECharts title may fallback.');
            }
        })();
    }

    await chartFontReadyPromise;
};
