import chartTitleFontUrl from '@/assets/fonts/DunHuangFeiTian-XingKaiTi-2.ttf?url';

let chartFontReadyPromise: Promise<void> | null = null;

const loadChartTitleFontFace = async () => {
    if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') {
        return;
    }

    if (document.fonts.check('16px "ChartTitleFont"')) {
        return;
    }

    try {
        const face = new FontFace('ChartTitleFont', `url(${chartTitleFontUrl})`, {
            style: 'normal',
            weight: '400',
        });
        const loadedFace = await face.load();
        document.fonts.add(loadedFace);
    } catch {
        // Fallback to CSS @font-face declaration if manual loading fails.
    }
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
                fontSet.load('16px "ChartTitleFont"', '诗人籍贯分布图'),
                fontSet.load('16px "ContentFont"'),
                fontSet.ready,
            ]);
        })();
    }

    await chartFontReadyPromise;
};
