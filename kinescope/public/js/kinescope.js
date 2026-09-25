/* Javascript for KinescopeXBlock. */
function KinescopeXBlock(runtime, element, data) {
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
    });
}
