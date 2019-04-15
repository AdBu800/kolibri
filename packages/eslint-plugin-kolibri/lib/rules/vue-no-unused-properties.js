/**
 * @fileoverview Disallow unused properties, data or computed properties.
 */

'use strict';

const remove = require('lodash/remove');
const eslintPluginVueUtils = require('eslint-plugin-vue/lib/utils');

const utils = require('../utils');

const GROUP_PROPERTY = 'props';
const GROUP_DATA = 'data';
const GROUP_COMPUTED_PROPERTY = 'computed';

const PROPERTY_LABEL = {
  [GROUP_PROPERTY]: 'property',
  [GROUP_DATA]: 'data',
  [GROUP_COMPUTED_PROPERTY]: 'computed property',
};

const reportUnusedProperties = (context, properties) => {
  if (!properties || !properties.length) {
    return;
  }

  properties.forEach(property => {
    context.report({
      node: property.node,
      message: `Unused ${PROPERTY_LABEL[property.groupName]} found: "${property.name}"`,
    });
  });
};

const create = context => {
  let hasTemplate;
  let unusedProperties = [];
  let thisExpressionsVariablesNames = [];

  const initialize = {
    Program(node) {
      if (!utils.checkVueEslintParser(context)) {
        return;
      }

      hasTemplate = Boolean(node.templateBody);
    },
  };

  const scriptVisitor = Object.assign(
    {},
    utils.executeOnThisExpressionProperty(property => {
      thisExpressionsVariablesNames.push(property.name);
    }),
    eslintPluginVueUtils.executeOnVue(context, obj => {
      unusedProperties = Array.from(
        eslintPluginVueUtils.iterateProperties(
          obj,
          new Set([GROUP_PROPERTY, GROUP_DATA, GROUP_COMPUTED_PROPERTY])
        )
      );

      const watchersNames = utils.getWatchersNames(obj);

      remove(unusedProperties, property => {
        return (
          thisExpressionsVariablesNames.includes(property.name) ||
          watchersNames.includes(property.name)
        );
      });

      if (!hasTemplate && unusedProperties.length) {
        reportUnusedProperties(context, unusedProperties);
      }
    })
  );

  const templateVisitor = Object.assign(
    {},
    {
      'VExpressionContainer[expression!=null][references]'(node) {
        const referencesNames = utils.getReferencesNames(node.references);

        remove(unusedProperties, property => {
          return referencesNames.includes(property.name);
        });
      },
    },
    utils.executeOnRootTemplateEnd(() => {
      if (unusedProperties.length) {
        reportUnusedProperties(context, unusedProperties);
      }
    })
  );

  return Object.assign(
    {},
    initialize,
    eslintPluginVueUtils.defineTemplateBodyVisitor(context, templateVisitor, scriptVisitor)
  );
};

module.exports = {
  meta: {
    docs: {
      description: 'Disallow unused properties, data or computed properties',
    },
    fixable: null,
  },
  create,
};
