import json,pathlib
R=pathlib.Path(__file__).resolve().parents[1]
def md(text):return {'cell_type':'markdown','metadata':{},'source':text.splitlines(keepends=True)}
def code(text):return {'cell_type':'code','execution_count':None,'metadata':{},'outputs':[],'source':text.splitlines(keepends=True)}
cells=[md('''# AI agents in STEM — inspect the evidence

Run all cells with **Python (Pyodide)** in the browser, or Python 3.11+ with matplotlib on your computer. First browser launch downloads the runtime/packages. Download your notebook to preserve your work.

These are transparent teaching models. They do not run CalculiX, ORCA, ngspice or GROMACS. The occupancy counts are **synthetic**, not measurements from the lecture. Outcomes connect to Q01–Q08: distinguish execution from acceptance, check units and assumptions, and keep uncertainty visible.
'''),code((R/'content/lab/scientific_model.py').read_text()),code('''checks=validate()
print("SCIENTIFIC_CHECKS", checks)
assert checks["status"]=="pass"
'''),md('''## 1. Axial bar — units before confidence (Q02–Q04)

Model: uniform linear elastic bar; fixed left end, axial force at the right; no bending or thermal effects. The independent discrete system assembles local stiffness matrices and solves equilibrium. Exact nodal agreement for this simple patch does not validate arbitrary 3D meshes.

Predict: if area doubles at fixed force, what happens to extension? Change `area_m2` and test your prediction. Explain why entering 210 instead of 210e9 for a modulus in Pa would be wrong.
'''),code('''import matplotlib.pyplot as plt
length_m=0.01
area_m2=4e-6
force_N=1000.0
E_Pa=210e9
u=bar_discrete_solution(force_N,length_m,area_m2,E_Pa,8)
x=[length_m*i/8 for i in range(9)]
exact=[axial_bar(force_N,t,area_m2,E_Pa) if t else 0 for t in x]
fig,ax=plt.subplots(figsize=(7,3.5))
ax.plot([t*1000 for t in x],[t*1e6 for t in exact],label="Analytical")
ax.plot([t*1000 for t in x],[t*1e6 for t in u],"o",label="Assembled 1D elements")
ax.set(xlabel="Position (mm)",ylabel="Axial displacement (µm)",title="Uniform bar: independent equilibrium check")
ax.legend();ax.grid(alpha=.25);plt.show()
print("BAR_END_UM",u[-1]*1e6)
assert abs(axial_bar(force_N,length_m,2*area_m2,E_Pa)/u[-1]-.5)<1e-12
'''),md('''## 2. Two requirements, two checks (Q06 and Q06A)

Small-signal, single-pole model: `H(f)=A0/(1+j f/fp)`. Here A0=10 and fp=100010 Hz. The cutoff is relative to the low-frequency gain, at half power (about −3.0103 dB). This model omits slew rate, clipping, noise, component variation, layout parasitics and stability of a real circuit.

Predict the acceptance result before running. A circuit must meet both gain ≥10 and cutoff ≥150 kHz. Then try gain=8 and pole=200000 Hz — the transfer task from the course.
'''),code('''gain=10.0
pole=100010.0
frequencies=[10**(2+i/40) for i in range(181)]
db=[20*math.log10(abs(amplifier(f,gain,pole))) for f in frequencies]
fc=cutoff_bisection(gain,pole)
fig,ax=plt.subplots(figsize=(7,3.5))
ax.semilogx(frequencies,db,label="Model AC magnitude")
ax.axvline(fc,color="darkorange",label=f"Cutoff {fc/1000:.2f} kHz")
ax.axvline(150000,color="darkred",linestyle="--",label="Required minimum cutoff")
ax.set(xlabel="Frequency (Hz)",ylabel="Gain (dB)",title="Gain alone is only half the test")
ax.grid(alpha=.25);ax.legend();plt.show()
print("CIRCUIT_ACCEPTANCE",{"gain_pass":gain>=10,"bandwidth_pass":fc>=150000,"accepted":gain>=10 and fc>=150000})
print("TRANSFER",{"gain_pass":8>=10,"bandwidth_pass":cutoff_bisection(8,200000)>=150000})
assert not (8>=10 and cutoff_bisection(8,200000)>=150000)
'''),md('''## 3. A mean is not a zero-event claim (Q08)

Definition: each synthetic count is the number of water molecules meeting one hypothetical local distance criterion in one frame. It is not a deep-bilayer occupancy definition. The sequence has clustered events; treating these frames as independent samples would understate sampling uncertainty.

Calculate the nonzero-frame fraction and the maximum as well as the mean. Move the two events apart without changing the mean: which temporal conclusions change? A real analysis needs region definitions, equilibration checks, correlation times and independent sampling; this tiny example estimates no real confidence interval.
'''),code('''counts=[0]*18+[1,1]
stats=occupancy_summary(counts)
fig,axes=plt.subplots(1,2,figsize=(8,3))
axes[0].step(range(len(counts)),counts,where="mid")
axes[0].set(xlabel="Synthetic frame",ylabel="Local water count",title="Intermittent occupancy")
axes[1].bar(["zero","nonzero"],[sum(x==0 for x in counts),sum(x>0 for x in counts)])
axes[1].set(ylabel="Frames",title="Distribution matters")
fig.tight_layout();plt.show()
print("SYNTHETIC_OCCUPANCY",stats)
assert stats["mean"]==.1 and stats["maximum"]==1
print("LAB_COMPLETE: 3 figures; independent bar/circuit checks; synthetic occupancy; transfer task")
'''),md('''## 4. Write the handoff (Q01, Q03, Q05, Q05A)

For one workflow in your own field, write: the question; inputs and units; physical and numerical assumptions; software/model versions; what actually executed; an independent acceptance check; uncertainty and remaining limitations; and the exact artifacts another researcher needs.

An ORCA submission ID establishes scheduling acceptance, not convergence or chemical accuracy. An AI-selected model remains an assumption to examine. Do not claim the simple models above validate the recorded production simulations.
''')]
doc={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'display_name':'Python (Pyodide)','language':'python','name':'python'},'language_info':{'name':'python','version':'3.12'}},'cells':[{**c,'id':f'stem-{i:02}'}for i,c in enumerate(cells)]}
(R/'content/lab/stem-evidence.ipynb').write_text(json.dumps(doc,ensure_ascii=False,indent=1)+'\n',encoding='utf8')
print('Prepared notebook with',len(cells),'cells')
