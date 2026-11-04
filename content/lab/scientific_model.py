"""Small teaching models in SI units. No ORCA, ngspice or MD solver is run here."""
import math

def axial_bar(load=1000.0, length=0.01, area=4e-6, modulus=210e9):
    """Uniform uniaxial small-strain bar: fixed left, axial force at right.

    Neglect lateral restraint, bending, plasticity and thermal effects.
    SI: force N, length m, area m², modulus Pa; returns extension m.
    """
    if not all(math.isfinite(v) for v in (load,length,area,modulus)) or min(length,area,modulus)<=0:
        raise ValueError('Finite load and positive length, area and modulus required')
    return load*length/(area*modulus)

def bar_discrete_solution(load=1000.0,length=0.01,area=4e-6,modulus=210e9,elements=4):
    """Independent assembled 1D linear finite-element solve by elimination.

    Uniform bar with one end fixed. Exact nodal agreement for this patch is
    expected and is not a convergence study for arbitrary 3D geometries.
    """
    axial_bar(load,length,area,modulus)
    if not isinstance(elements,int) or not 1<=elements<=100:raise ValueError('1..100 elements required')
    n=elements;k=modulus*area/(length/n)
    K=[[0.0]*n for _ in range(n)];f=[0.0]*n;f[-1]=load
    for e in range(n):
        for a,signa in [(e,-1),(e+1,1)]:
            for b,signb in [(e,-1),(e+1,1)]:
                if a and b:K[a-1][b-1]+=k*signa*signb
    for col in range(n):
        pivot=K[col][col]
        for row in range(col+1,n):
            factor=K[row][col]/pivot
            for j in range(col,n):K[row][j]-=factor*K[col][j]
            f[row]-=factor*f[col]
    u=[0.0]*n
    for i in range(n-1,-1,-1):u[i]=(f[i]-sum(K[i][j]*u[j]for j in range(i+1,n)))/K[i][i]
    return [0.0]+u

def amplifier(frequency,gain=10.0,pole_hz=100010.0):
    """Illustrative small-signal, single-pole model, H=A0/(1+j f/fp)."""
    if not all(math.isfinite(x) for x in (frequency,gain,pole_hz)) or frequency<0 or gain<=0 or pole_hz<=0:raise ValueError('Invalid amplifier parameter')
    return gain/complex(1,frequency/pole_hz)

def cutoff_bisection(gain=10.0,pole_hz=100010.0):
    """Locate half-power magnitude numerically; do not return pole_hz directly."""
    target=abs(amplifier(0,gain,pole_hz))/math.sqrt(2)
    lo,hi=0.0,100*pole_hz
    for _ in range(80):
        mid=(lo+hi)/2
        if abs(amplifier(mid,gain,pole_hz))>target:lo=mid
        else:hi=mid
    return (lo+hi)/2

def occupancy_summary(counts):
    """Counts for a stated frame/region definition; no MD trajectory analysis."""
    if not counts or any(not isinstance(x,int) or x<0 for x in counts):raise ValueError('Nonnegative integer counts required')
    return {'frames':len(counts),'mean':sum(counts)/len(counts),'nonzero_fraction':sum(x>0 for x in counts)/len(counts),'maximum':max(counts)}

def validate():
    for n in [1,2,4,8,16]:
        for force in [-500,0,1000,2000]:
            u=bar_discrete_solution(load=force,elements=n)
            exact=axial_bar(load=force)
            assert max(abs(x-exact*i/n)for i,x in enumerate(u))<1e-15
    for gain,pole in [(10,100010),(8,200000),(3,1)]:
        fc=cutoff_bisection(gain,pole)
        assert abs(fc/pole-1)<1e-12
        for f in [0,pole,10*pole]:assert abs(abs(amplifier(f,gain,pole))-gain/math.sqrt(1+(f/pole)**2))<1e-12
    synthetic=[0]*18+[1,1]
    water=occupancy_summary(synthetic)
    assert water['mean']==0.1 and water['nonzero_fraction']==0.1 and water['maximum']==1
    return {'status':'pass','bar_extension_m':axial_bar(),'bar_force_N':1000,'bar_elements_tested':[1,2,4,8,16],'amplifier_cutoff_hz':cutoff_bisection(),'bandwidth_requirement_hz':150000,'bandwidth_pass':cutoff_bisection()>=150000,'synthetic_occupancy':water,'limits':'1D small-strain uniform bar, single-pole small-signal circuit, synthetic occupancy; not validation of the recorded external solvers or real bilayer.'}

if __name__=='__main__':
    import json
    print(json.dumps(validate(),indent=2))
