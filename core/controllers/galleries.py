# Copyright 2014 The Oppia Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Controllers for the gallery pages."""

__author__ = 'sll@google.com (Sean Lip)'

import collections

from core.controllers import base
from core.domain import config_domain
from core.domain import exp_domain
from core.domain import exp_services
from core.domain import rights_manager
from core.domain import widget_registry
from core.platform import models
current_user_services = models.Registry.import_current_user_services()
import feconf

import jinja2


EXPLORATION_ID_KEY = 'explorationId'

ALLOW_YAML_FILE_UPLOAD = config_domain.ConfigProperty(
    'allow_yaml_file_upload', 'Boolean',
    'Whether to allow file uploads via YAML in the gallery page.',
    default_value=False)

CONTRIBUTE_GALLERY_PAGE_ANNOUNCEMENT = config_domain.ConfigProperty(
    'contribute_gallery_page_announcement', 'Html',
    'An announcement to display on top of the contribute gallery page.',
    default_value='')


class GalleryPage(base.BaseHandler):
    """The exploration gallery page."""

    PAGE_NAME_FOR_CSRF = 'gallery'

    def get(self):
        """Handles GET requests."""
        noninteractive_widget_html = (
            widget_registry.Registry.get_noninteractive_widget_html())

        self.values.update({
            'nav_mode': feconf.NAV_MODE_GALLERY,
            'allow_yaml_file_upload': ALLOW_YAML_FILE_UPLOAD.value,
            'noninteractive_widget_html': jinja2.utils.Markup(
                noninteractive_widget_html),
        })
        self.render_template('galleries/gallery.html')


class GalleryHandler(base.BaseHandler):
    """Provides data for the exploration gallery page."""

    def get(self):
        """Handles GET requests."""
        # TODO(sll): Implement paging.

        # TODO(sll): Precompute and cache gallery categories. Or have a fixed
        # list of categories and 'Other', and gradually classify the
        # explorations in 'Other'.

        explorations_dict = (
            exp_services.get_non_private_explorations_summary_dict())
        explorations_dict.update(
            exp_services.get_private_at_least_viewable_explorations_summary_dict(
                self.user_id))

        explorations_list = [{
            'id': exp_id,
            'title': exp_data['title'],
            'category': exp_data['category'],
            'objective': exp_data['objective'],
            'language_code': exp_data['language_code'],
            'last_updated': exp_data['last_updated'],
            'status': exp_data['status'],
            'community_owned': exp_data['community_owned'],
        } for (exp_id, exp_data) in explorations_dict.iteritems()]


        private_explorations_list = sorted(
            [e_dict for e_dict in explorations_list
             if e_dict['status'] == rights_manager.EXPLORATION_STATUS_PRIVATE],
            key=lambda x: x['last_updated'],
            reverse=True)
        beta_explorations_list = sorted(
            [e_dict for e_dict in explorations_list 
             if e_dict['status'] == rights_manager.EXPLORATION_STATUS_PUBLIC],
            key=lambda x: x['last_updated'],
            reverse=True)
        publicized_explorations_list = sorted(
            [e_dict for e_dict in explorations_list 
             if e_dict['status'] == rights_manager.EXPLORATION_STATUS_PUBLICIZED],
            key=lambda x: x['last_updated'],
            reverse=True)

        self.values.update({
            'released': publicized_explorations_list,
            'beta': beta_explorations_list,
            'private': private_explorations_list,
        })
        self.render_json(self.values)


class NewExploration(base.BaseHandler):
    """Creates a new exploration."""

    PAGE_NAME_FOR_CSRF = 'gallery'

    @base.require_registered_as_editor
    def post(self):
        """Handles POST requests."""
        title = self.payload.get('title')
        category = self.payload.get('category')

        if not title:
            raise self.InvalidInputException('No title supplied.')
        if not category:
            raise self.InvalidInputException('No category chosen.')

        new_exploration_id = exp_services.get_new_exploration_id()
        exploration = exp_domain.Exploration.create_default_exploration(
            new_exploration_id, title, category)
        exp_services.save_new_exploration(self.user_id, exploration)

        self.render_json({EXPLORATION_ID_KEY: new_exploration_id})


class UploadExploration(base.BaseHandler):
    """Uploads a new exploration."""

    PAGE_NAME_FOR_CSRF = 'gallery'

    @base.require_registered_as_editor
    def post(self):
        """Handles POST requests."""
        title = self.payload.get('title')
        category = self.payload.get('category')
        yaml_content = self.request.get('yaml_file')

        if not title:
            raise self.InvalidInputException('No title supplied.')
        if not category:
            raise self.InvalidInputException('No category chosen.')

        new_exploration_id = exp_services.get_new_exploration_id()
        if ALLOW_YAML_FILE_UPLOAD.value:
            exp_services.save_new_exploration_from_yaml_and_assets(
                self.user_id, yaml_content, title, category,
                new_exploration_id, [])
            self.render_json({EXPLORATION_ID_KEY: new_exploration_id})
        else:
            raise self.InvalidInputException(
                'This server does not allow file uploads.')


class RecentCommitsHandler(base.BaseHandler):
    """Returns a list of recent commits."""

    def get(self):
        """Handles GET requests."""
        urlsafe_start_cursor = self.request.get('cursor')
        all_commits, new_urlsafe_start_cursor, more = (
            exp_services.get_next_page_of_all_non_private_commits(
                urlsafe_start_cursor=urlsafe_start_cursor))
        all_commit_dicts = [commit.to_dict() for commit in all_commits]
        self.render_json({
            'results': all_commit_dicts,
            'cursor': new_urlsafe_start_cursor,
            'more': more,
        })


class GalleryRedirectPage(base.BaseHandler):
    """An old exploration gallery page."""

    def get(self):
        """Handles GET requests."""
        self.redirect('/gallery')
