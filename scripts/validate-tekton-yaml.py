import yaml, glob, sys, copy
import jsonschema

# CRD schemas straight from the Tekton release we actually install.
crds={}
for d in yaml.safe_load_all(open('/tmp/tekton.yaml')):
    if d and d.get('kind')=='CustomResourceDefinition':
        name=d['metadata']['name']
        for v in d['spec']['versions']:
            if v.get('served'):
                crds[(d['spec']['group'], v['name'], d['spec']['names']['kind'])]=v['schema']['openAPIV3Schema']

def harden(node):
    """CRDs are structural: unknown fields are rejected. jsonschema only
    enforces that if we say additionalProperties:false explicitly."""
    if not isinstance(node,dict): return node
    if node.get('x-kubernetes-preserve-unknown-fields') is True: return node
    if node.get('x-kubernetes-int-or-string') is True: return node
    props=node.get('properties')
    if isinstance(props,dict):
        for k in list(props): props[k]=harden(props[k])
        node.setdefault('additionalProperties', False)
        node['properties']={k:v for k,v in props.items()}
    if isinstance(node.get('items'),dict): node['items']=harden(node['items'])
    for key in ('allOf','anyOf','oneOf'):
        if isinstance(node.get(key),list): node[key]=[harden(x) for x in node[key]]
    return node

fails=0
for f in sorted(glob.glob('tekton/tasks/*.yaml')+glob.glob('tekton/pipeline.yaml')+glob.glob('tekton/pipelinerun.yaml')):
    for doc in yaml.safe_load_all(open(f)):
        if not doc: continue
        key=(doc['apiVersion'].split('/')[0], doc['apiVersion'].split('/')[1], doc['kind'])
        schema=crds.get(key)
        if schema is None:
            print(f"  ?  {f}: no schema for {key}"); continue
        s=harden(copy.deepcopy(schema))
        v=jsonschema.Draft7Validator(s)
        errs=sorted(v.iter_errors(doc), key=lambda e:list(e.path))
        if errs:
            fails+=1
            print(f"  ✗ {f} ({doc['kind']})")
            for e in errs[:6]:
                print(f"      at .{'/'.join(map(str,e.path))}: {e.message[:160]}")
        else:
            print(f"  ✓ {f} ({doc['kind']})")
print()
print("TEKTON SCHEMA VALIDATION:", "FAILED" if fails else "ALL VALID")
sys.exit(1 if fails else 0)
