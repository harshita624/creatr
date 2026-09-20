import React,{useState} from "react"

const initial=[4,5,2,1,2,3,4,5]
function Rating()
{
    const [review,setReview]=useState(initial)
    const [rating,setRating]=useState(0)
    function getCount(star)
    {
        let cnt=0;
        for(let rating of review)
        {
            if(rating==star)
            {
                cnt++
            }
        }
        return cnt
    }
    function addRating(star)
    {
        setReview([...review,star])
        setRating(0)
    }
    return(
        <div>
            {[5,4,3,2,1].map(star=>{
                const count=getCount(star)
                const percent=Math.round((count/total)*100)
                return(
                    <div key={star}>
                <span key={star}>{star}</span>
                </div>
                )
        
            })}

            {[1,2,3,4,5].map(star=>{
                <div>
                    <span key={star} onClick={()=>addRating(star)} onMouseEnter={()=>setRating(star)} style={{color:star<=rating?"orange":"red"}}></span>
                </div>
            })}
        </div>
    )
}

