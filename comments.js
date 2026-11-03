(() => {
    const container = document.querySelector('.giscus');
    const script = document.createElement('script');
    const getTheme = () => document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'dark'
        : 'light';

    for (const attribute of container.attributes) {
        if (attribute.name.startsWith('data-')) {
            script.setAttribute(attribute.name, attribute.value);
        }
    }

    const syncTheme = () => {
        const theme = getTheme();
        script.setAttribute('data-theme', theme);
        container.querySelector('iframe.giscus-frame')?.contentWindow.postMessage(
            { giscus: { setConfig: { theme } } },
            'https://giscus.app',
        );
    };

    syncTheme();
    container.addEventListener('load', syncTheme, true);
    new MutationObserver(syncTheme).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });

    script.src = 'https://giscus.app/client.js';
    script.crossOrigin = 'anonymous';
    script.async = true;
    container.append(script);
})();
