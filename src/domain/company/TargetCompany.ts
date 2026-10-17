import { AggregateRoot } from '../shared/AggregateRoot';
import { Result } from '../shared/Result';
import { CompanyId } from './CompanyId';
import { CompanyProfile } from './CompanyProfile';
import { StockedReverseQuestion } from './StockedReverseQuestion';

export interface TargetCompanyProps {
  id: CompanyId;
  name: string;
  profile: CompanyProfile;
  stockedQuestions: StockedReverseQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

export class TargetCompany extends AggregateRoot<CompanyId> {
  private _name: string;
  private _profile: CompanyProfile;
  private _stockedQuestions: StockedReverseQuestion[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: TargetCompanyProps) {
    super(props.id);
    this._name = props.name;
    this._profile = props.profile;
    this._stockedQuestions = props.stockedQuestions;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get name(): string {
    return this._name;
  }

  public get profile(): CompanyProfile {
    return this._profile;
  }

  public get stockedQuestions(): ReadonlyArray<StockedReverseQuestion> {
    return this._stockedQuestions;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public static create(props: {
    id?: CompanyId;
    name: string;
    profile: CompanyProfile;
    stockedQuestions?: StockedReverseQuestion[];
  }): Result<TargetCompany> {
    if (!props.name || props.name.trim().length === 0) {
      return Result.fail('企業名は必須です。');
    }

    const id = props.id || CompanyId.create().getValue();
    const now = new Date();

    return Result.ok(
      new TargetCompany({
        id,
        name: props.name.trim(),
        profile: props.profile,
        stockedQuestions: props.stockedQuestions || [],
        createdAt: now,
        updatedAt: now,
      })
    );
  }

  public static hydrate(props: TargetCompanyProps): TargetCompany {
    return new TargetCompany(props);
  }

  public updateProfile(newProfile: CompanyProfile): void {
    this._profile = newProfile;
    this._updatedAt = new Date();
  }

  public addStockedQuestion(question: StockedReverseQuestion): Result<void> {
    const existing = this._stockedQuestions.find((q) => q.id === question.id);
    if (existing) {
      return Result.fail(`ID: ${question.id} の逆質問は既にストックされています。`);
    }

    this._stockedQuestions.push(question);
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  public removeStockedQuestion(questionId: string): Result<void> {
    const initialLength = this._stockedQuestions.length;
    this._stockedQuestions = this._stockedQuestions.filter((q) => q.id !== questionId);
    if (this._stockedQuestions.length === initialLength) {
      return Result.fail(`ID: ${questionId} の逆質問が見つかりません。`);
    }

    this._updatedAt = new Date();
    return Result.ok(undefined);
  }
}
