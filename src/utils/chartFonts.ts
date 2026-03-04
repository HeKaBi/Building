export const waitForChartFonts = async () => {
    if (typeof document === 'undefined' || !document.fonts) {
        return;
    }

    const fontSet = document.fonts;

    await Promise.allSettled([
        fontSet.load('1em TitleFont'),
        fontSet.load('1em ContentFont'),
        fontSet.ready,
    ]);
};
