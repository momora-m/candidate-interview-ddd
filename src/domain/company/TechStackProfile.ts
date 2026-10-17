import { ValueObject } from '../shared/ValueObject';
import { Result } from '../shared/Result';

export type CloudPlatformType = 'GCP' | 'AWS' | 'AZURE' | 'HYBRID' | 'OTHER';

export interface TechStackProfileProps {
  primaryLanguages: string[];
  cloudPlatform: CloudPlatformType;
  architectureHighlights: string[];
  techBlogUrls: string[];
}

export class TechStackProfile extends ValueObject<TechStackProfileProps> {
  private constructor(props: TechStackProfileProps) {
    super(props);
  }

  public get primaryLanguages(): ReadonlyArray<string> {
    return this.props.primaryLanguages;
  }

  public get cloudPlatform(): CloudPlatformType {
    return this.props.cloudPlatform;
  }

  public get architectureHighlights(): ReadonlyArray<string> {
    return this.props.architectureHighlights;
  }

  public get techBlogUrls(): ReadonlyArray<string> {
    return this.props.techBlogUrls;
  }

  public static create(props: {
    primaryLanguages: string[];
    cloudPlatform?: CloudPlatformType;
    architectureHighlights?: string[];
    techBlogUrls?: string[];
  }): Result<TechStackProfile> {
    if (!props.primaryLanguages || props.primaryLanguages.length === 0) {
      return Result.fail('主要なプログラミング言語・技術要素を最低1つ指定してください。');
    }

    return Result.ok(
      new TechStackProfile({
        primaryLanguages: props.primaryLanguages.map((l) => l.trim()).filter(Boolean),
        cloudPlatform: props.cloudPlatform || 'GCP',
        architectureHighlights: (props.architectureHighlights || []).map((a) => a.trim()).filter(Boolean),
        techBlogUrls: (props.techBlogUrls || []).map((u) => u.trim()).filter(Boolean),
      })
    );
  }
}
