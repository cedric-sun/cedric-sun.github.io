document.addEventListener("DOMContentLoaded", () => {
    const getHeadingLabel = (heading) => {
        const clone = heading.cloneNode(true);
        clone.querySelectorAll('.heading-anchor').forEach((anchor) => anchor.remove());
        return clone.textContent.trim();
    };

    // Toggle theme
    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    document.querySelector("#goto-top").addEventListener('click', (e) => {
        window.scrollTo(0, 0);
    });

    // Language menu toggle
    const languageMenu = document.querySelector("#language-menu");
    const switchTranslate = document.querySelector("#switch-translate");

    switchTranslate.addEventListener('click', (e) => {
        // Don't toggle if clicking on a language link
        if (e.target.closest('.language-option')) {
            return;
        }
        languageMenu.classList.toggle('hidden');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!switchTranslate.contains(e.target)) {
            languageMenu.classList.add('hidden');
        }
    });

    document.querySelector("#switch-theme").addEventListener('click', (e) => {
        toggleTheme();
    });

    const tagCloudStage = document.querySelector('.js-tag-cloud');
    const tagCloudSource = document.querySelector('.js-tag-cloud-source');
    const tagCloudFps = document.querySelector('.js-tag-cloud-fps');

    if (tagCloudStage && tagCloudSource) {
        const sourceLinks = Array.from(tagCloudSource.querySelectorAll('a[data-count]'));
        const counts = sourceLinks.map((link) => Number(link.dataset.count));
        const minCount = Math.min(...counts);
        const maxCount = Math.max(...counts);
        const countRange = maxCount - minCount;

        if (sourceLinks.length > 0) {
            const availableWidth = tagCloudStage.parentElement.getBoundingClientRect().width;
            const radius = Math.max(140, Math.min(500, (availableWidth - 16) / 2));
            const diameter = radius * 2;
            const sphereRadius = radius * 0.75;
            const depth = radius * 2;
            const itemCount = sourceLinks.length;
            const xPositions = new Float32Array(itemCount);
            const yPositions = new Float32Array(itemCount);
            const zPositions = new Float32Array(itemCount);
            const projectedX = new Float32Array(itemCount);
            const projectedY = new Float32Array(itemCount);
            const projectedWidth = new Float32Array(itemCount);
            const projectedHeight = new Float32Array(itemCount);
            const projectedOpacity = new Float32Array(itemCount);
            const weights = new Float32Array(itemCount);
            const labels = new Array(itemCount);
            const hrefs = new Array(itemCount);
            const sprites = new Array(itemCount);
            const drawOrder = Array.from({ length: itemCount }, (_, index) => index);
            const goldenAngle = Math.PI * (3 - Math.sqrt(5));
            const sphere = document.createElement('div');
            const canvas = document.createElement('canvas');
            const hitTarget = document.createElement('a');
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            const context = canvas.getContext('2d', {
                alpha: true,
                desynchronized: true,
            });

            sphere.className = 'tag-cloud-sphere';
            sphere.style.width = `${diameter}px`;
            sphere.style.height = `${diameter}px`;
            canvas.className = 'tag-cloud-canvas';
            canvas.width = Math.round(diameter * pixelRatio);
            canvas.height = Math.round(diameter * pixelRatio);
            canvas.style.width = `${diameter}px`;
            canvas.style.height = `${diameter}px`;
            canvas.setAttribute('aria-hidden', 'true');
            hitTarget.className = 'tag-cloud-hit-target';
            hitTarget.tabIndex = -1;
            hitTarget.setAttribute('aria-hidden', 'true');
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

            sourceLinks.forEach((sourceLink, index) => {
                const count = Number(sourceLink.dataset.count);
                const weight = countRange === 0
                    ? 0.5
                    : Math.log1p(count - minCount) / Math.log1p(countRange);
                const label = sourceLink.querySelector('.tag-cloud-label').textContent;
                const normalizedY = (2 * index + 1) / itemCount - 1;
                const ringRadius = Math.sqrt(1 - normalizedY * normalizedY);
                const angle = index * goldenAngle;

                xPositions[index] = Math.cos(angle) * ringRadius * sphereRadius;
                yPositions[index] = normalizedY * sphereRadius;
                zPositions[index] = Math.sin(angle) * ringRadius * sphereRadius;
                weights[index] = weight;
                labels[index] = label;
                hrefs[index] = sourceLink.getAttribute('href');
            });

            sphere.append(canvas, hitTarget);
            tagCloudStage.hidden = false;
            tagCloudStage.append(sphere);

            let isDragging = false;
            let didDrag = false;
            let dragDistance = 0;
            let lastPointerX = 0;
            let lastPointerY = 0;
            let lastPointerTime = 0;
            let lastFrameTime = performance.now();
            const initialAngle = Math.random() * Math.PI * 2;
            const initialSpeed = 6 + Math.random() * 6;
            let angularVelocityX = Math.sin(initialAngle) * initialSpeed;
            let angularVelocityY = Math.cos(initialAngle) * initialSpeed;
            let inertiaDirectionX = angularVelocityX / initialSpeed;
            let inertiaDirectionY = angularVelocityY / initialSpeed;
            let dragStopTimer;
            let animationFrameId;
            let fpsSampleStart = performance.now();
            let fpsFrameCount = 0;
            let hoveredIndex = -1;
            let pointerInside = false;
            let pointerX = 0;
            let pointerY = 0;
            let hoverColor;
            let borderColor;
            const inertiaRemainingPerSecond = 0.55;
            const minimumAngularSpeed = 3;

            const buildSprites = () => {
                const styles = getComputedStyle(document.documentElement);
                const fontFamily = styles.fontFamily;
                const textColor = styles.getPropertyValue('--text-color').trim();
                const baseFontSize = parseFloat(styles.fontSize);

                hoverColor = styles.getPropertyValue('--hover-color').trim();
                borderColor = styles.getPropertyValue('--border-color').trim();

                for (let index = 0; index < itemCount; index += 1) {
                    const fontSize = baseFontSize * (0.85 + weights[index] * 0.75);
                    const font = `${fontSize}px ${fontFamily}`;

                    context.font = font;

                    const width = Math.ceil(context.measureText(labels[index]).width + 8);
                    const height = Math.ceil(fontSize * 1.4);
                    const sprite = document.createElement('canvas');
                    const spriteContext = sprite.getContext('2d');

                    sprite.width = Math.ceil(width * pixelRatio);
                    sprite.height = Math.ceil(height * pixelRatio);
                    spriteContext.scale(pixelRatio, pixelRatio);
                    spriteContext.font = font;
                    spriteContext.fillStyle = textColor;
                    spriteContext.textAlign = 'center';
                    spriteContext.textBaseline = 'middle';
                    spriteContext.fillText(labels[index], width / 2, height / 2);
                    sprites[index] = { canvas: sprite, width, height };
                }
            };

            const updateHitTarget = () => {
                if (hoveredIndex === -1 || didDrag) {
                    hitTarget.style.display = 'none';
                    tagCloudStage.classList.remove('is-link-hovered');
                    return;
                }

                hitTarget.href = hrefs[hoveredIndex];
                hitTarget.title = labels[hoveredIndex];
                hitTarget.style.display = 'block';
                hitTarget.style.left = `${projectedX[hoveredIndex] - projectedWidth[hoveredIndex] / 2}px`;
                hitTarget.style.top = `${projectedY[hoveredIndex] - projectedHeight[hoveredIndex] / 2}px`;
                hitTarget.style.width = `${projectedWidth[hoveredIndex]}px`;
                hitTarget.style.height = `${projectedHeight[hoveredIndex]}px`;
                tagCloudStage.classList.add('is-link-hovered');
            };

            const updateHoveredItem = () => {
                hoveredIndex = -1;

                if (pointerInside && !didDrag) {
                    for (let orderIndex = itemCount - 1; orderIndex >= 0; orderIndex -= 1) {
                        const index = drawOrder[orderIndex];

                        if (
                            projectedOpacity[index] > 0.25
                            && Math.abs(pointerX - projectedX[index]) <= projectedWidth[index] / 2
                            && Math.abs(pointerY - projectedY[index]) <= projectedHeight[index] / 2
                        ) {
                            hoveredIndex = index;
                            break;
                        }
                    }
                }

                updateHitTarget();
            };

            const startAnimation = () => {
                if (animationFrameId === undefined) {
                    lastFrameTime = performance.now();
                    fpsSampleStart = lastFrameTime;
                    fpsFrameCount = 0;
                    animationFrameId = requestAnimationFrame(renderFrame);
                }
            };

            const endDragging = () => {
                isDragging = false;
                clearTimeout(dragStopTimer);
                tagCloudStage.classList.remove('is-dragging');
                startAnimation();
            };

            function renderFrame(time) {
                animationFrameId = undefined;
                const elapsedSeconds = Math.min((time - lastFrameTime) / 1000, 0.05);

                fpsFrameCount += 1;
                if (tagCloudFps && time - fpsSampleStart >= 500) {
                    const fps = Math.round(fpsFrameCount * 1000 / (time - fpsSampleStart));

                    tagCloudFps.textContent = ` · ${fps} FPS`;
                    fpsSampleStart = time;
                    fpsFrameCount = 0;
                }

                if (!isDragging) {
                    const decay = Math.pow(inertiaRemainingPerSecond, elapsedSeconds);

                    angularVelocityX *= decay;
                    angularVelocityY *= decay;

                    const angularSpeed = Math.hypot(angularVelocityX, angularVelocityY);

                    if (angularSpeed < minimumAngularSpeed) {
                        angularVelocityX = inertiaDirectionX * minimumAngularSpeed;
                        angularVelocityY = inertiaDirectionY * minimumAngularSpeed;
                    }
                }

                if (angularVelocityX !== 0 || angularVelocityY !== 0) {
                    const rotationX = angularVelocityX * elapsedSeconds * Math.PI / 180;
                    const rotationY = angularVelocityY * elapsedSeconds * Math.PI / 180;
                    const sinX = Math.sin(rotationX);
                    const cosX = Math.cos(rotationX);
                    const sinY = Math.sin(rotationY);
                    const cosY = Math.cos(rotationY);

                    for (let index = 0; index < itemCount; index += 1) {
                        const previousX = xPositions[index];
                        const y = yPositions[index] * cosX - zPositions[index] * sinX;
                        const rotatedZ = yPositions[index] * sinX + zPositions[index] * cosX;
                        const z = rotatedZ * cosY - previousX * sinY;
                        const x = previousX * cosY + rotatedZ * sinY;

                        xPositions[index] = x;
                        yPositions[index] = y;
                        zPositions[index] = z;
                    }
                }

                drawOrder.sort((left, right) => zPositions[left] - zPositions[right]);
                context.clearRect(0, 0, diameter, diameter);

                for (let orderIndex = 0; orderIndex < itemCount; orderIndex += 1) {
                    const index = drawOrder[orderIndex];
                    const scale = 2 * depth / (2 * depth + zPositions[index]);
                    const opacity = Math.min(1, Math.max(0, scale * scale - 0.25));
                    const sprite = sprites[index];
                    const width = sprite.width * scale;
                    const height = sprite.height * scale;
                    const x = radius + xPositions[index];
                    const y = radius + yPositions[index];

                    projectedX[index] = x;
                    projectedY[index] = y;
                    projectedWidth[index] = width;
                    projectedHeight[index] = height;
                    projectedOpacity[index] = opacity;
                    context.globalAlpha = opacity;

                    if (index === hoveredIndex && !didDrag) {
                        const left = x - width / 2;
                        const top = y - height / 2;
                        const cornerRadius = Math.min(6 * scale, height / 2);

                        context.fillStyle = hoverColor;
                        context.strokeStyle = borderColor;
                        context.lineWidth = 1;
                        context.beginPath();
                        context.roundRect(left, top, width, height, cornerRadius);
                        context.fill();
                        context.stroke();
                    }

                    context.drawImage(sprite.canvas, x - width / 2, y - height / 2, width, height);
                }

                context.globalAlpha = 1;
                updateHoveredItem();
                lastFrameTime = time;
                if (isDragging || angularVelocityX !== 0 || angularVelocityY !== 0) {
                    animationFrameId = requestAnimationFrame(renderFrame);
                } else if (tagCloudFps) {
                    tagCloudFps.textContent = ' · 0 FPS';
                }
            }

            tagCloudStage.addEventListener('pointerdown', (event) => {
                if (event.button !== 0) {
                    return;
                }

                isDragging = true;
                didDrag = false;
                dragDistance = 0;
                lastPointerX = event.clientX;
                lastPointerY = event.clientY;
                lastPointerTime = event.timeStamp;
                angularVelocityX = 0;
                angularVelocityY = 0;
                tagCloudStage.classList.add('is-dragging');
                startAnimation();
            });

            window.addEventListener('pointermove', (event) => {
                if (pointerInside) {
                    const bounds = canvas.getBoundingClientRect();

                    pointerX = event.clientX - bounds.left;
                    pointerY = event.clientY - bounds.top;
                }

                if (!isDragging) {
                    updateHoveredItem();
                    startAnimation();
                    return;
                }

                const deltaX = event.clientX - lastPointerX;
                const deltaY = event.clientY - lastPointerY;
                const elapsed = Math.max(event.timeStamp - lastPointerTime, 8);

                dragDistance += Math.hypot(deltaX, deltaY);
                didDrag = dragDistance > 5;
                if (didDrag) {
                    updateHitTarget();
                }
                angularVelocityX = angularVelocityX * 0.65 + deltaY / elapsed * 87.5;
                angularVelocityY = angularVelocityY * 0.65 - deltaX / elapsed * 87.5;
                const angularSpeed = Math.hypot(angularVelocityX, angularVelocityY);

                if (angularSpeed > 0) {
                    inertiaDirectionX = angularVelocityX / angularSpeed;
                    inertiaDirectionY = angularVelocityY / angularSpeed;
                }
                lastPointerX = event.clientX;
                lastPointerY = event.clientY;
                lastPointerTime = event.timeStamp;
                startAnimation();

                clearTimeout(dragStopTimer);
                dragStopTimer = setTimeout(() => {
                    if (isDragging) {
                        angularVelocityX = 0;
                        angularVelocityY = 0;
                    }
                }, 50);
            }, { passive: true });

            tagCloudStage.addEventListener('pointerenter', () => {
                pointerInside = true;
            });
            tagCloudStage.addEventListener('pointerleave', () => {
                pointerInside = false;
                updateHoveredItem();
            });
            window.addEventListener('pointerup', endDragging);
            window.addEventListener('pointercancel', endDragging);
            tagCloudStage.addEventListener('click', (event) => {
                if (didDrag) {
                    event.preventDefault();
                    event.stopPropagation();
                    didDrag = false;
                }
            }, true);

            buildSprites();
            new MutationObserver(() => {
                buildSprites();
                startAnimation();
            }).observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme'],
            });
            startAnimation();
            if (tagCloudFps) {
                tagCloudFps.textContent = ' · 0 FPS';
                tagCloudFps.hidden = false;
            }
        }
    }

    const pageSidebar = document.querySelector('#page-sidebar');
    const postNavigator = document.querySelector('#post-navigator');
    const postNavigatorTree = postNavigator?.querySelector('.post-navigator-tree');
    const articleContent = document.querySelector('.article-content');

    if (postNavigator && postNavigatorTree && articleContent) {
        const headings = Array.from(articleContent.querySelectorAll('h2[id], h3[id]'));

        if (headings.length > 0) {
            const tree = document.createElement('ul');
            let currentH2Item = null;
            let currentH2Children = null;

            headings.forEach((heading) => {
                const item = document.createElement('li');
                item.className = `heading-${heading.tagName.toLowerCase()}`;

                const link = document.createElement('a');
                link.href = `#${heading.id}`;
                link.textContent = getHeadingLabel(heading);
                item.append(link);

                if (heading.tagName === 'H2') {
                    tree.append(item);
                    currentH2Item = item;
                    currentH2Children = null;
                    return;
                }

                if (!currentH2Item) {
                    tree.append(item);
                    return;
                }

                if (!currentH2Children) {
                    currentH2Children = document.createElement('ul');
                    currentH2Item.append(currentH2Children);
                }

                currentH2Children.append(item);
            });

            postNavigatorTree.append(tree);
            postNavigator.hidden = false;
            pageSidebar?.classList.add('has-post-navigator');
        }
    }

    document.querySelectorAll('.table-wrapper').forEach((tableWrapper) => {
        const expandButton = tableWrapper.querySelector('.table-expand-button');

        expandButton.addEventListener('click', () => {
            const isExpanded = tableWrapper.classList.toggle('is-expanded');

            expandButton.setAttribute('aria-expanded', String(isExpanded));
            expandButton.textContent = isExpanded ? 'Collapse table' : 'Expand table';
        });
    });

    const mermaidDiagrams = Array.from(document.querySelectorAll('.mermaid'));

    if (mermaidDiagrams.length > 0) {
        const mermaidZoomLevels = [100, 150, 200];

        const applyMermaidZoom = (diagram) => {
            const zoomIndex = Number(diagram.dataset.mermaidZoomIndex);
            const svg = diagram.querySelector('.mermaid-viewport svg');
            const zoomOut = diagram.querySelector('.mermaid-zoom-out');
            const zoomIn = diagram.querySelector('.mermaid-zoom-in');
            const zoomLevel = diagram.querySelector('.mermaid-zoom-level');

            zoomLevel.textContent = `${mermaidZoomLevels[zoomIndex]}%`;
            zoomOut.disabled = !svg || zoomIndex === 0;
            zoomIn.disabled = !svg || zoomIndex === mermaidZoomLevels.length - 1;

            if (svg) {
                diagram.style.setProperty('--mermaid-zoom', `${mermaidZoomLevels[zoomIndex]}%`);
                svg.style.width = '100%';
                svg.style.maxWidth = 'none';
                svg.style.height = 'auto';
            }
        };

        mermaidDiagrams.forEach((diagram) => {
            diagram.dataset.mermaidSource = diagram.querySelector('.mermaid-source').textContent.trim();
            diagram.dataset.mermaidZoomIndex = '0';

            diagram.querySelector('.mermaid-zoom-out').addEventListener('click', () => {
                diagram.dataset.mermaidZoomIndex = String(
                    Math.max(0, Number(diagram.dataset.mermaidZoomIndex) - 1),
                );
                applyMermaidZoom(diagram);
            });
            diagram.querySelector('.mermaid-zoom-in').addEventListener('click', () => {
                diagram.dataset.mermaidZoomIndex = String(
                    Math.min(
                        mermaidZoomLevels.length - 1,
                        Number(diagram.dataset.mermaidZoomIndex) + 1,
                    ),
                );
                applyMermaidZoom(diagram);
            });
        });

        // Pin the runtime because Mermaid output can change between releases.
        const mermaidModule = import('https://cdn.jsdelivr.net/npm/mermaid@11.12.2/dist/mermaid.esm.min.mjs');
        let renderSequence = 0;
        let renderQueue = Promise.resolve();

        const showMermaidError = (diagram, error) => {
            const message = document.createElement('p');
            const source = document.createElement('pre');
            const detail = error instanceof Error ? error.message : String(error);

            message.className = 'mermaid-error';
            message.setAttribute('role', 'alert');
            message.textContent = `Diagram rendering failed: ${detail}`;
            source.className = 'mermaid-source';
            source.textContent = diagram.dataset.mermaidSource;
            diagram.querySelector('.mermaid-toolbar').hidden = true;
            diagram.classList.add('mermaid--error');
            const viewport = diagram.querySelector('.mermaid-viewport');

            diagram.style.setProperty('--mermaid-zoom', '100%');
            viewport.removeAttribute('role');
            viewport.replaceChildren(message, source);
            console.error('Mermaid rendering failed', error);
        };

        const renderMermaidDiagrams = async () => {
            const { default: mermaid } = await mermaidModule;
            const theme = document.documentElement.getAttribute('data-theme') === 'dark'
                ? 'dark'
                : 'default';
            const sequence = ++renderSequence;

            mermaid.initialize({
                startOnLoad: false,
                securityLevel: 'strict',
                suppressErrorRendering: true,
                theme,
            });

            for (let index = 0; index < mermaidDiagrams.length; index += 1) {
                const diagram = mermaidDiagrams[index];
                const viewport = diagram.querySelector('.mermaid-viewport');

                try {
                    const { svg, bindFunctions } = await mermaid.render(
                        `mermaid-${sequence}-${index}`,
                        diagram.dataset.mermaidSource,
                    );

                    diagram.classList.remove('mermaid--error');
                    viewport.innerHTML = svg;
                    viewport.setAttribute('role', 'img');
                    diagram.querySelector('.mermaid-toolbar').hidden = false;
                    applyMermaidZoom(diagram);
                    bindFunctions?.(viewport);
                } catch (error) {
                    showMermaidError(diagram, error);
                }
            }
        };

        const queueMermaidRender = () => {
            renderQueue = renderQueue
                .then(renderMermaidDiagrams)
                .catch((error) => {
                    mermaidDiagrams.forEach((diagram) => showMermaidError(diagram, error));
                });
        };

        new MutationObserver(queueMermaidRender).observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
        queueMermaidRender();
    }

    // Add copy button functionality to code blocks
    document.querySelectorAll('.jose-wrapper button').forEach((copyButton) => {
        copyButton.addEventListener('click', async () => {
            const text = copyButton.closest('.jose-wrapper').querySelector('pre').textContent;
            await navigator.clipboard.writeText(text);

            // blink text prompt
            const old = copyButton.textContent;
            copyButton.textContent = 'Copied!';

            setTimeout(() => { copyButton.textContent = old }, 2000);
        });
    });
})
