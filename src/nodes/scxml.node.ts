import z from 'zod';
import { BaseNode, BaseNodeAttr } from '../models/base';
import { CreateFromJsonResponse } from '../models/methods';

const SCXML_VERSIONS = ['1.0', '1.1'] as const;
type SCXMLVersion = (typeof SCXML_VERSIONS)[number];

const SCXML_DATAMODELS = ['null', 'ecmascript', 'xpath'] as const;
type SCXMLDataModel = (typeof SCXML_DATAMODELS)[number];

const SCXML_VERSION_DESCRIPTION = `SCXML version of this node. This specifically defines which version of the SCXML spec you are using. Available: ${SCXML_VERSIONS.join(', ')}`;
const SCXML_DATAMODEL_DESCRIPTION = `The datamodel that this document requires. Available: ${SCXML_DATAMODELS.join(', ')}`;

const SCXMLNodeAttr = BaseNodeAttr.extend({
  initial: z.string().optional(),
  name: z.string().optional(),
  version: z
    .enum(SCXML_VERSIONS, {
      error: `Invalid SCXML version. ${SCXML_VERSION_DESCRIPTION}`,
    })
    .default('1.0')
    .describe(SCXML_VERSION_DESCRIPTION),
  datamodel: z
    .enum(SCXML_DATAMODELS, {
      error: `Invalid datamodel. ${SCXML_DATAMODEL_DESCRIPTION}`,
    })
    .default('ecmascript')
    .describe(SCXML_DATAMODEL_DESCRIPTION),
});

export type SCXMLNodeType = {
  scxml: z.infer<typeof SCXMLNodeAttr>;
};

export class SCXMLNode
  extends BaseNode
  implements z.infer<typeof SCXMLNodeAttr>
{
  readonly initial: string;
  readonly name: string;
  readonly version: SCXMLVersion;
  readonly datamodel: SCXMLDataModel;

  constructor({ scxml }: SCXMLNodeType) {
    super(scxml);
    this.allowChildren = true;
    this.initial = scxml.initial ?? '';
    this.name = scxml.name ?? '';
    this.version = scxml.version;
    this.datamodel = scxml.datamodel;
  }

  static label = 'scxml';
  static schema = SCXMLNodeAttr;

  static createFromJSON(
    jsonInput: Record<string, unknown>,
  ): CreateFromJsonResponse<SCXMLNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput),
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    return {
      success: true,
      node: new SCXMLNode({ scxml: { ...data } }),
      error: undefined,
    };
  }
}
