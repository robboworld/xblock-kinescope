/* Javascript for KinescopeXBlock. */
function KinescopeXBlock(runtime, element, data) {
    // After this long without the player's load event, tell the learner the video is still coming.
    var SLOW_LOADING_MS = 8000;

    $(function ($) {
        var videoId = data && data.video_id;
        if (!videoId) {
            return;
        }
        var src = 'https://kinescope.io/embed/' + videoId;
        $('.kinescope_iframe', element).each(function () {
            if (this.getAttribute('src') !== src) {
                this.setAttribute('src', src);
            }
        });

        $('.video_wrapper.is-loading', element).each(function () {
            var wrapper = this;
            var iframe = wrapper.querySelector('.kinescope_iframe');
            if (iframe) {
                iframe.addEventListener('load', function () {
                    wrapper.classList.remove('is-loading', 'is-slow');
                });
            }
            window.setTimeout(function () {
                if (!wrapper.classList.contains('is-loading')) {
                    return;
                }
                var text = wrapper.querySelector('.kinescope_loader_text');
                var slowText = wrapper.getAttribute('data-slow-text');
                if (text && slowText) {
                    text.textContent = slowText;
                }
                wrapper.classList.add('is-slow');
            }, SLOW_LOADING_MS);
        });
    });
}
