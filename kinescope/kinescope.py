"""This XBlock embeds content from Kinescope through Iframes"""

# Modifications Copyright (C) 2026 Robbo. See NOTICE at repository root.

from django.core.exceptions import ValidationError
from web_fragments.fragment import Fragment
from xblock.core import XBlock
from xblock.fields import Boolean, Scope, String
try:
    from xblock.utils.studio_editable import StudioEditableXBlockMixin
except ModuleNotFoundError: # For compatibility with Palm and earlier
    from xblockutils.studio_editable import StudioEditableXBlockMixin
try:
    from xblock.utils.resources import ResourceLoader
except ModuleNotFoundError: # For compatibility with Palm and earlier
    from xblockutils.resources import ResourceLoader

from xblock.validation import ValidationMessage

from .utils import _, _lazy, validate_parse_kinescope_url


loader = ResourceLoader(__name__)


class KinescopeXBlock(StudioEditableXBlockMixin, XBlock):
    """
    This XBlock renders Iframe for Kinescope videos.
    """

    display_name = String(
        display_name=_lazy("Display Name"),
        help=_lazy("The display name for this component."),
        default="Kinescope",
        scope=Scope.settings,
    )

    video_link = String(
        display_name=_lazy("Video Link/URL"),
        default="",
        scope=Scope.content,
        force_export=True,
        help=_lazy("Video link copied from Kinescope dashboard.")
    )

    show_header_text = Boolean(
        display_name=_lazy("Show caption above video"),
        help=_lazy("Video has no caption unless this option is enabled."),
        default=False,
        scope=Scope.settings,
    )

    header_text = String(
        display_name=_lazy("Caption text"),
        default="",
        scope=Scope.content,
        force_export=True,
        help=_lazy("Caption shown above the video when enabled."),
    )

    editable_fields = ('display_name', 'video_link', 'show_header_text', 'header_text')

    def studio_view(self, context):
        """Studio editor with enabled/disabled select and dependent caption field."""
        fragment = Fragment()
        if self.service_declaration("i18n"):
            ugettext = self.ugettext
        else:
            ugettext = lambda text: text

        editor_context = {'fields': []}
        for field_name in self.editable_fields:
            field = self.fields[field_name]
            assert field.scope in (Scope.content, Scope.settings), (
                "Only Scope.content or Scope.settings fields can be used with "
                "StudioEditableXBlockMixin."
            )
            field_info = self._make_field_info(field_name, field)
            if field_info is not None:
                if field_info.get('type') == 'boolean':
                    field_info['enabled_label'] = ugettext(_("Caption setting enabled"))
                    field_info['disabled_label'] = ugettext(_("Caption setting disabled"))
                editor_context['fields'].append(field_info)
        fragment.content = loader.render_django_template(
            'static/html/studio_edit.html',
            editor_context,
        )
        fragment.add_javascript(loader.load_unicode('public/js/studio_edit.js'))
        fragment.add_css_url(self.runtime.local_resource_url(self, "public/css/kinescope.css"))
        fragment.initialize_js('KinescopeStudioEdit')
        return fragment

    def validate_field_data(self, validation, data):
        """
        Validate video link and video id
        """
        if not data.video_link:
            validation.add(ValidationMessage(ValidationMessage.ERROR, _("Video Link is mandatory")))
        else:
            try:
                validate_parse_kinescope_url(data.video_link)
            except ValidationError as e:
                for msg in e.messages:
                    validation.add(ValidationMessage(ValidationMessage.ERROR, msg))


    def student_view(self, context=None):
        """
        The primary view of the KinescopeXBlock, shown to students
        when viewing courses.
        """
        try:
            video_id = validate_parse_kinescope_url(self.video_link)
        except ValidationError:
            video_id = ""
        header_text = (self.header_text or '').strip()
        frag = Fragment(loader.render_django_template(
            "static/html/kinescope.html",
            context={
                'video_id': video_id,
                'show_header_text': bool(self.show_header_text),
                'header_text': header_text,
            },
        ))
        frag.add_css_url(self.runtime.local_resource_url(self, "public/css/kinescope.css"))
        frag.add_javascript_url(self.runtime.local_resource_url(self, "public/js/kinescope.js"))
        frag.initialize_js('KinescopeXBlock', {'video_id': video_id})
        return frag


    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("KinescopeXBlock",
             """<kinescope/>
             """),
            ("Multiple KinescopeXBlock",
             """<vertical_demo>
                <kinescope/>
                <kinescope/>
                <kinescope/>
                </vertical_demo>
             """),
        ]
