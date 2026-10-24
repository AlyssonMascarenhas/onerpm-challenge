import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The release workflow only deploys a tag that looks like `vX.Y.Z`, and the release PR must be titled
 * `chore(release): X.Y.Z` (the scope list of commitlint has `release`). Both depend on how release-please is
 * configured, which no unit of code exercises: these tests keep the three files saying the same thing.
 */
const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');

const config = JSON.parse(read('release-please-config.json')) as {
  'group-pull-request-title-pattern'?: string;
  packages: Record<string, Record<string, unknown>>;
};
const rootPackage = config.packages['.'];
const workflow = read('.github/workflows/release.yml');

/** The pattern of the tag guard in the workflow: `[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]`. */
const tagGuard = () => {
  const source = /\[\[ "\$TAG" =~ (\S+) \]\]/.exec(workflow)?.[1];
  expect(source, 'the workflow checks the tag').toBeDefined();
  return new RegExp(source as string);
};

describe('release-please configuration', () => {
  it('has one package, at the root', () => {
    expect(Object.keys(config.packages)).toEqual(['.']);
  });

  it('names the tag vX.Y.Z, with no component in front (the workflow only deploys such tags)', () => {
    expect(rootPackage['include-component-in-tag']).toBe(false);
    expect(rootPackage['include-v-in-tag']).toBe(true);
  });

  it('gives the tag it would create to the tag guard of the workflow, and nothing else', () => {
    const guard = tagGuard();

    expect(guard.test('v0.1.0')).toBe(true);
    expect(guard.test('v12.34.56')).toBe(true);
    expect(guard.test('onerpm-tracks-v0.1.0')).toBe(false);
    expect(guard.test('0.1.0')).toBe(false);
    expect(guard.test('v1.2.3-beta.1')).toBe(false);
    expect(guard.test('v1.2.3\nsomething')).toBe(false);
  });

  it('titles the (grouped) release PR chore(release): <version>, with a scope that commitlint allows', () => {
    const pattern = config['group-pull-request-title-pattern'];

    expect(pattern).toBe('chore(release): ${version}');
    expect(read('commitlint.config.js')).toContain("'release'");
  });

  it('does not set a per-package title, which release-please ignores for the grouped PR', () => {
    expect(rootPackage['pull-request-title-pattern']).toBeUndefined();
  });

  it('is the config and the manifest the workflow gives to release-please', () => {
    expect(workflow).toContain('config-file: release-please-config.json');
    expect(workflow).toContain('manifest-file: .release-please-manifest.json');
    expect(JSON.parse(read('.release-please-manifest.json'))).toEqual({
      '.': JSON.parse(read('package.json')).version,
    });
  });
});

describe('release workflow', () => {
  it('deploys only for a release or for a tag chosen by hand, never for an ordinary merge', () => {
    expect(workflow).toContain(
      "needs.release-please.outputs.release_created == 'true' || inputs.tag != ''",
    );
  });

  it('builds from the tag, not from the branch', () => {
    expect(workflow).toContain('ref: refs/tags/${{ env.TAG }}');
  });

  it('keeps the deploy hook secret out of the actions that do not need it', () => {
    const outsideTheDeployStep = workflow.split('- name: Tell the host to deploy')[0];

    expect(outsideTheDeployStep).not.toContain('secrets.DEPLOY_HOOK_URL');
  });
});
