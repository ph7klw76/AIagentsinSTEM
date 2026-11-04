"""Execute all notebook code cells, preserve printed checks and real plot images."""
import pathlib,json,io,contextlib,datetime,sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=pathlib.Path(__file__).resolve().parents[1];out=ROOT/'.local/notebook-desktop';out.mkdir(parents=True,exist_ok=True)
notebook=json.loads((ROOT/'content/lab/stem-evidence.ipynb').read_text(encoding='utf8'))
ns={'__name__':'course_notebook'};figures=[];results=[]
def show():
 for i in plt.get_fignums():
  fig=plt.figure(i);name=f'figure-{len(figures)+1}.png';fig.savefig(out/name,dpi=130,bbox_inches='tight');figures.append({'file':name,'axes':len(fig.axes),'lines':sum(len(a.lines)for a in fig.axes),'patches':sum(len(a.patches)for a in fig.axes)})
 plt.close('all')
plt.show=show
for index,cell in enumerate(notebook['cells']):
 if cell['cell_type']!='code':continue
 text=''.join(cell['source']);s=io.StringIO()
 with contextlib.redirect_stdout(s):exec(compile(text,f'notebook-cell-{index}','exec'),ns)
 results.append({'cell':index,'status':'pass','stdout':s.getvalue()})
assert len(figures)==3 and 'LAB_COMPLETE' in results[-1]['stdout']
parameter={'original':ns['axial_bar'](),'double_area':ns['axial_bar'](area=8e-6),'transfer_gain_pass':8>=10,'transfer_bandwidth_pass':ns['cutoff_bisection'](8,200000)>=150000}
assert abs(parameter['double_area']/parameter['original']-.5)<1e-12
report={'status':'pass','timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat(),'python':sys.version,'matplotlib':matplotlib.__version__,'context':'desktop Python, all notebook code cells in order','cells':results,'figures':figures,'parameterChange':parameter,'scientificChecks':ns['checks']}
(ROOT/'evidence/notebook-desktop.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
